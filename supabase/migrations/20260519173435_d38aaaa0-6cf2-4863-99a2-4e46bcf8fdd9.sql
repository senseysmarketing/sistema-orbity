
ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'uazapi',
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_provider_payload jsonb,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz;

CREATE TABLE IF NOT EXISTS public.whatsapp_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  account_id uuid,
  purpose text,
  action text NOT NULL,
  provider text NOT NULL DEFAULT 'uazapi',
  provider_endpoint text,
  http_status int,
  provider_status text,
  has_qr boolean,
  has_token boolean,
  error_message text,
  execution_id text,
  payload_keys text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_conn_logs_agency_created
  ON public.whatsapp_connection_logs (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_conn_logs_account_created
  ON public.whatsapp_connection_logs (account_id, created_at DESC);

ALTER TABLE public.whatsapp_connection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_conn_logs_select_admins" ON public.whatsapp_connection_logs;
CREATE POLICY "wa_conn_logs_select_admins"
  ON public.whatsapp_connection_logs
  FOR SELECT
  TO authenticated
  USING (public.is_agency_admin(agency_id));
