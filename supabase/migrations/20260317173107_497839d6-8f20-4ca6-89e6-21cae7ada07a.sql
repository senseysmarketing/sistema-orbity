
-- Replace find_lead_by_normalized_phone with variant-aware version
-- that handles Brazilian 9th digit (e.g. 5551998500033 vs 555198500033)
CREATE OR REPLACE FUNCTION public.find_lead_by_normalized_phone(p_agency_id uuid, p_phone_digits text)
 RETURNS TABLE(id uuid, name text, phone text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  digits text;
  variants text[];
  ddd text;
  local_part text;
BEGIN
  digits := regexp_replace(p_phone_digits, '\D', '', 'g');
  variants := ARRAY[digits];

  -- Brazilian number with country code: 55 + DDD(2) + number(8 or 9) = 12 or 13 digits
  IF digits LIKE '55%' AND length(digits) = 13 THEN
    -- Has 9th digit, generate variant without it: 55 + DDD + 8 digits
    ddd := substring(digits from 3 for 2);
    local_part := substring(digits from 6); -- last 8 digits (skip the 9)
    variants := variants || (('55' || ddd || local_part)::text);
  ELSIF digits LIKE '55%' AND length(digits) = 12 THEN
    -- Missing 9th digit, generate variant with it: 55 + DDD + 9 + 8 digits
    ddd := substring(digits from 3 for 2);
    local_part := substring(digits from 5); -- 8 digits
    variants := variants || (('55' || ddd || '9' || local_part)::text);
  END IF;

  -- Also try without country code
  IF digits LIKE '55%' THEN
    variants := variants || (substring(digits from 3)::text);
  END IF;

  RETURN QUERY
  SELECT l.id, l.name, l.phone
  FROM public.leads l
  WHERE l.agency_id = p_agency_id
    AND regexp_replace(l.phone, '\D', '', 'g') = ANY(variants)
  LIMIT 1;
END;
$$;

-- Merge Nilton's orphan conversation: move messages from orphan to main conversation
-- First find and fix the data
DO $$
DECLARE
  orphan_conv_id uuid;
  main_conv_id uuid;
  main_lead_id uuid;
BEGIN
  -- Find the orphan conversation (555198500033 without 9th digit properly)
  SELECT id INTO orphan_conv_id
  FROM whatsapp_conversations
  WHERE phone_number = '555198500033'
  LIMIT 1;

  -- Find the main conversation (with lead linked)
  SELECT wc.id, wc.lead_id INTO main_conv_id, main_lead_id
  FROM whatsapp_conversations wc
  WHERE wc.phone_number IN ('5551998500033', '+5551998500033')
    AND wc.lead_id IS NOT NULL
  LIMIT 1;

  IF orphan_conv_id IS NOT NULL AND main_conv_id IS NOT NULL AND orphan_conv_id <> main_conv_id THEN
    -- Move messages from orphan to main
    UPDATE whatsapp_messages
    SET conversation_id = main_conv_id
    WHERE conversation_id = orphan_conv_id;

    -- Update last_customer_message_at on main conversation
    UPDATE whatsapp_conversations
    SET last_customer_message_at = GREATEST(
      last_customer_message_at,
      (SELECT last_customer_message_at FROM whatsapp_conversations WHERE id = orphan_conv_id)
    )
    WHERE id = main_conv_id;

    -- Delete orphan conversation
    DELETE FROM whatsapp_conversations WHERE id = orphan_conv_id;

    RAISE NOTICE 'Merged orphan % into main % (lead %)', orphan_conv_id, main_conv_id, main_lead_id;
  END IF;

  -- Also mark any active automations for this lead as responded
  IF main_lead_id IS NOT NULL THEN
    UPDATE whatsapp_automation_control
    SET status = 'responded', conversation_state = 'customer_replied'
    WHERE lead_id = main_lead_id AND status IN ('active', 'processing');
  END IF;
END;
$$;
