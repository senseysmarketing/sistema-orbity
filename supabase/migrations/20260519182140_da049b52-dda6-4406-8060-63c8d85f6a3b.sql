
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS remote_jid text,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_account_message_uniq
  ON public.whatsapp_messages (account_id, message_id);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_created_idx
  ON public.whatsapp_messages (conversation_id, created_at DESC);

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS context text DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_preview text;

CREATE INDEX IF NOT EXISTS whatsapp_conversations_client_idx
  ON public.whatsapp_conversations (account_id, client_id) WHERE client_id IS NOT NULL;
