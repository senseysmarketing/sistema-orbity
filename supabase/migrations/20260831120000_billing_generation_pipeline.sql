-- Billing generation pipeline for monthly contract invoices.
-- Keeps monthly closure local/idempotent and moves external gateway calls to a worker.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS billing_cycle_month date,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'skipped',
  ADD COLUMN IF NOT EXISTS generation_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_last_error text,
  ADD COLUMN IF NOT EXISTS generation_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_next_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS generation_locked_by text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

ALTER TABLE public.client_payments
  DROP CONSTRAINT IF EXISTS client_payments_source_check;

ALTER TABLE public.client_payments
  DROP CONSTRAINT IF EXISTS client_payments_generation_status_check;

ALTER TABLE public.client_payments
  ADD CONSTRAINT client_payments_source_check
  CHECK (source IN ('manual', 'monthly_contract', 'extra_charge', 'manual_import'))
  NOT VALID;

ALTER TABLE public.client_payments
  ADD CONSTRAINT client_payments_generation_status_check
  CHECK (generation_status IN ('pending', 'processing', 'generated', 'retrying', 'failed', 'skipped'))
  NOT VALID;

ALTER TABLE public.client_payments
  VALIDATE CONSTRAINT client_payments_source_check;

ALTER TABLE public.client_payments
  VALIDATE CONSTRAINT client_payments_generation_status_check;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_payments_monthly_contract_once
ON public.client_payments (agency_id, client_id, billing_cycle_month, source)
WHERE source = 'monthly_contract' AND billing_cycle_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_payments_generation_queue
ON public.client_payments (generation_status, generation_next_attempt_at, created_at)
WHERE generation_status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_client_payments_cycle_gateway
ON public.client_payments (agency_id, billing_cycle_month, billing_type, generation_status)
WHERE billing_cycle_month IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.billing_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES public.client_payments(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  billing_type text,
  event text NOT NULL,
  status text NOT NULL,
  attempt integer,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can view billing generation logs" ON public.billing_generation_logs;
CREATE POLICY "Agency members can view billing generation logs"
ON public.billing_generation_logs
FOR SELECT
USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Agency admins can manage billing generation logs" ON public.billing_generation_logs;
CREATE POLICY "Agency admins can manage billing generation logs"
ON public.billing_generation_logs
FOR ALL
USING (public.is_agency_admin(agency_id))
WITH CHECK (public.is_agency_admin(agency_id));

CREATE INDEX IF NOT EXISTS idx_billing_generation_logs_payment
ON public.billing_generation_logs (payment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_generation_logs_agency
ON public.billing_generation_logs (agency_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.validate_client_billing_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.default_billing_type IS NOT NULL AND
     NEW.default_billing_type NOT IN ('manual', 'asaas', 'conexa', 'stripe') THEN
    RAISE EXCEPTION 'Invalid billing type: %', NEW.default_billing_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_payment_billing_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.billing_type IS NOT NULL AND
     NEW.billing_type NOT IN ('manual', 'asaas', 'conexa', 'stripe') THEN
    RAISE EXCEPTION 'Invalid billing type: %', NEW.billing_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_billing_generation_payments(
  p_limit integer DEFAULT 5,
  p_worker_id text DEFAULT NULL
)
RETURNS SETOF public.client_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit integer := greatest(1, least(coalesce(p_limit, 5), 25));
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.client_payments
    WHERE generation_status IN ('pending', 'retrying')
      AND coalesce(generation_next_attempt_at, now()) <= now()
      AND status IN ('pending', 'overdue')
      AND billing_type IN ('conexa', 'asaas', 'stripe')
    ORDER BY coalesce(generation_next_attempt_at, created_at), created_at, id
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.client_payments cp
  SET
    generation_status = 'processing',
    generation_attempts = coalesce(cp.generation_attempts, 0) + 1,
    generation_last_attempt_at = now(),
    generation_locked_at = now(),
    generation_locked_by = coalesce(p_worker_id, 'billing-worker'),
    updated_at = now()
  FROM candidates
  WHERE cp.id = candidates.id
  RETURNING cp.*;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_billing_generation_payments(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_billing_generation_payments(integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.is_valid_billing_worker_secret(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault'
AS $$
BEGIN
  IF p_secret IS NULL OR p_secret = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'billing_worker_secret'
      AND decrypted_secret = p_secret
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_valid_billing_worker_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_billing_worker_secret(text) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'billing_worker_secret'
  ) THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'billing_worker_secret',
      'Internal secret used by pg_cron to call process-billing-generation'
    );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_schema OR undefined_function THEN
  RAISE NOTICE 'Vault is not available; configure BILLING_WORKER_SECRET manually before enabling cron.';
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('monthly-closure-job');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Wake hourly; the Edge Function only runs at 00:00 on day 1 in America/Sao_Paulo unless force=true.
SELECT cron.schedule(
  'monthly-closure-job',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/monthly-closure',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-billing-worker-secret', coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'billing_worker_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now())::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

DO $$
BEGIN
  PERFORM cron.unschedule('process-billing-generation');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-billing-generation',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-billing-generation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-billing-worker-secret', coalesce((SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'billing_worker_secret' LIMIT 1), '')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'ts', now(), 'limit', 5)::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);
