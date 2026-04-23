-- Função: religar conversas WhatsApp órfãs aos leads da agência
CREATE OR REPLACE FUNCTION public.relink_orphan_whatsapp_conversations(p_agency_id uuid)
RETURNS TABLE(linked_count integer, total_orphans integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_conv record;
  v_lead record;
  v_linked integer := 0;
  v_total integer := 0;
BEGIN
  IF p_agency_id IS NULL THEN
    RAISE EXCEPTION 'agency_id is required';
  END IF;

  FOR v_conv IN
    SELECT c.id, c.phone_number
    FROM public.whatsapp_conversations c
    JOIN public.whatsapp_accounts a ON a.id = c.account_id
    WHERE a.agency_id = p_agency_id
      AND c.lead_id IS NULL
      AND c.phone_number IS NOT NULL
  LOOP
    v_total := v_total + 1;

    SELECT * INTO v_lead
    FROM public.find_lead_by_normalized_phone(p_agency_id, v_conv.phone_number)
    LIMIT 1;

    IF v_lead.id IS NOT NULL THEN
      UPDATE public.whatsapp_conversations
      SET lead_id = v_lead.id, updated_at = now()
      WHERE id = v_conv.id;
      v_linked := v_linked + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_linked, v_total;
END;
$$;

-- Trigger: ao criar/atualizar telefone do lead, vincular conversas órfãs do mesmo número
CREATE OR REPLACE FUNCTION public.auto_link_lead_to_whatsapp_conversations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_digits text;
  v_variants text[];
  v_ddd text;
  v_local text;
BEGIN
  IF NEW.phone IS NULL OR NEW.agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Apenas executar se telefone foi setado/alterado
  IF TG_OP = 'UPDATE' AND OLD.phone IS NOT DISTINCT FROM NEW.phone THEN
    RETURN NEW;
  END IF;

  v_digits := regexp_replace(NEW.phone, '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RETURN NEW;
  END IF;

  v_variants := ARRAY[v_digits];

  IF v_digits LIKE '55%' AND length(v_digits) = 13 THEN
    v_ddd := substring(v_digits from 3 for 2);
    v_local := substring(v_digits from 6);
    v_variants := v_variants || (('55' || v_ddd || v_local)::text);
  ELSIF v_digits LIKE '55%' AND length(v_digits) = 12 THEN
    v_ddd := substring(v_digits from 3 for 2);
    v_local := substring(v_digits from 5);
    v_variants := v_variants || (('55' || v_ddd || '9' || v_local)::text);
  END IF;

  IF v_digits LIKE '55%' THEN
    v_variants := v_variants || (substring(v_digits from 3)::text);
  END IF;

  -- Linkar conversas órfãs cujo telefone normalizado bata com qualquer variante
  UPDATE public.whatsapp_conversations c
  SET lead_id = NEW.id, updated_at = now()
  FROM public.whatsapp_accounts a
  WHERE c.account_id = a.id
    AND a.agency_id = NEW.agency_id
    AND c.lead_id IS NULL
    AND regexp_replace(c.phone_number, '\D', '', 'g') = ANY(v_variants);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_link_lead_whatsapp ON public.leads;
CREATE TRIGGER trg_auto_link_lead_whatsapp
AFTER INSERT OR UPDATE OF phone ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.auto_link_lead_to_whatsapp_conversations();