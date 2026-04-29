ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS remote_jid TEXT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_remote_jid
  ON public.whatsapp_conversations (remote_jid)
  WHERE remote_jid IS NOT NULL;