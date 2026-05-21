-- Adiciona lead_id direto em whatsapp_messages para espelhamento robusto no modal
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_lead_id
  ON public.whatsapp_messages(lead_id)
  WHERE lead_id IS NOT NULL;

-- Backfill a partir da conversation atual
UPDATE public.whatsapp_messages m
SET lead_id = c.lead_id
FROM public.whatsapp_conversations c
WHERE m.conversation_id = c.id
  AND m.lead_id IS NULL
  AND c.lead_id IS NOT NULL;

-- Trigger: sempre copiar lead_id a partir da conversation no insert/update
CREATE OR REPLACE FUNCTION public.sync_whatsapp_message_lead_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT lead_id INTO v_lead_id
    FROM public.whatsapp_conversations
    WHERE id = NEW.conversation_id;
    IF v_lead_id IS NOT NULL THEN
      NEW.lead_id := v_lead_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whatsapp_message_lead_id ON public.whatsapp_messages;
CREATE TRIGGER trg_sync_whatsapp_message_lead_id
  BEFORE INSERT OR UPDATE OF conversation_id
  ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_whatsapp_message_lead_id();

-- Quando a conversation passa a ter lead_id (linkagem/merge), propagar para suas mensagens
CREATE OR REPLACE FUNCTION public.propagate_lead_id_to_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (OLD.lead_id IS DISTINCT FROM NEW.lead_id) THEN
    UPDATE public.whatsapp_messages
       SET lead_id = NEW.lead_id
     WHERE conversation_id = NEW.id
       AND (lead_id IS NULL OR lead_id <> NEW.lead_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_lead_id_to_messages ON public.whatsapp_conversations;
CREATE TRIGGER trg_propagate_lead_id_to_messages
  AFTER UPDATE OF lead_id
  ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_lead_id_to_messages();