CREATE TABLE IF NOT EXISTS public.master_whatsapp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  phone_number text,
  status text,
  error_message text,
  provider_status text,
  provider_message_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_whatsapp_logs_created_at
  ON public.master_whatsapp_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_master_whatsapp_logs_action
  ON public.master_whatsapp_logs (action);

ALTER TABLE public.master_whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Master admins can view master whatsapp logs"
  ON public.master_whatsapp_logs;

CREATE POLICY "Master admins can view master whatsapp logs"
  ON public.master_whatsapp_logs
  FOR SELECT
  USING (public.is_master_agency_admin());