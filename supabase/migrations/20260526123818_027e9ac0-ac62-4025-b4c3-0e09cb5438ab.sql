
CREATE TABLE IF NOT EXISTS public.conexa_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,
  payment_id uuid REFERENCES public.client_payments(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'webhook',
  raw_body jsonb,
  headers jsonb,
  parsed_charge_id text,
  parsed_event text,
  match_status text NOT NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_conexa_webhook_log_received_at ON public.conexa_webhook_log(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_conexa_webhook_log_agency ON public.conexa_webhook_log(agency_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_conexa_webhook_log_charge ON public.conexa_webhook_log(parsed_charge_id);

ALTER TABLE public.conexa_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admin can read all conexa webhook logs"
ON public.conexa_webhook_log
FOR SELECT
TO authenticated
USING (public.is_master_admin());

CREATE POLICY "Agency owners can read their conexa webhook logs"
ON public.conexa_webhook_log
FOR SELECT
TO authenticated
USING (
  agency_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.agency_users au
    WHERE au.agency_id = conexa_webhook_log.agency_id
      AND au.user_id = (select auth.uid())
      AND au.role = 'owner'
  )
);

CREATE OR REPLACE FUNCTION public.cleanup_conexa_webhook_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.conexa_webhook_log WHERE received_at < now() - interval '30 days';
$$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-conexa-webhook-log');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-conexa-webhook-log',
  '17 3 * * *',
  $$ SELECT public.cleanup_conexa_webhook_log(); $$
);
