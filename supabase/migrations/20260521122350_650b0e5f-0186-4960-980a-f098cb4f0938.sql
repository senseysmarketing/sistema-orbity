-- 1) lead_history.user_id nullable (allow automated events)
ALTER TABLE public.lead_history ALTER COLUMN user_id DROP NOT NULL;

-- 2) Webhook decision logs
CREATE TABLE public.whatsapp_webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  agency_id uuid,
  lead_id uuid,
  conversation_id uuid,
  event text NOT NULL,
  message_id text,
  remote_jid text,
  phone_number text,
  from_me boolean,
  resolved_lead boolean,
  resolved_conversation boolean,
  action_taken text,
  error_message text,
  payload_keys text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_webhook_logs_agency_created ON public.whatsapp_webhook_logs (agency_id, created_at DESC);
CREATE INDEX idx_wa_webhook_logs_lead_created ON public.whatsapp_webhook_logs (lead_id, created_at DESC);
CREATE INDEX idx_wa_webhook_logs_conv_created ON public.whatsapp_webhook_logs (conversation_id, created_at DESC);

ALTER TABLE public.whatsapp_webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read webhook logs"
  ON public.whatsapp_webhook_logs
  FOR SELECT
  USING (public.user_belongs_to_agency(agency_id));
