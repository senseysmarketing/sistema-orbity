
-- 1) Logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_resolution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid,
  agency_id uuid,
  lead_id uuid,
  old_conversation_id uuid,
  new_conversation_id uuid,
  action text NOT NULL,
  phone_number text,
  remote_jid text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wcrl_account ON public.whatsapp_conversation_resolution_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_wcrl_lead ON public.whatsapp_conversation_resolution_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_wcrl_new_conv ON public.whatsapp_conversation_resolution_logs(new_conversation_id);
CREATE INDEX IF NOT EXISTS idx_wcrl_created ON public.whatsapp_conversation_resolution_logs(created_at DESC);

ALTER TABLE public.whatsapp_conversation_resolution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency members can read resolution logs" ON public.whatsapp_conversation_resolution_logs;
CREATE POLICY "Agency members can read resolution logs"
ON public.whatsapp_conversation_resolution_logs
FOR SELECT
TO authenticated
USING (agency_id IS NOT NULL AND public.user_belongs_to_agency(agency_id));

-- 2) Merge RPC
CREATE OR REPLACE FUNCTION public.merge_whatsapp_conversations(
  p_primary uuid,
  p_duplicates uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dup uuid;
  v_primary record;
  v_dup_row record;
  v_account uuid;
  v_agency uuid;
  v_lead uuid;
BEGIN
  IF p_primary IS NULL OR p_duplicates IS NULL OR array_length(p_duplicates, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT c.*, a.agency_id AS account_agency_id
    INTO v_primary
  FROM public.whatsapp_conversations c
  LEFT JOIN public.whatsapp_accounts a ON a.id = c.account_id
  WHERE c.id = p_primary;

  IF v_primary IS NULL THEN
    RAISE EXCEPTION 'Primary conversation % not found', p_primary;
  END IF;

  v_account := v_primary.account_id;
  v_agency := v_primary.account_agency_id;
  v_lead := v_primary.lead_id;

  FOREACH v_dup IN ARRAY p_duplicates LOOP
    IF v_dup = p_primary THEN CONTINUE; END IF;

    SELECT * INTO v_dup_row FROM public.whatsapp_conversations WHERE id = v_dup;
    IF v_dup_row IS NULL THEN CONTINUE; END IF;

    -- Move messages (ignore unique-conflict duplicates)
    BEGIN
      UPDATE public.whatsapp_messages
         SET conversation_id = p_primary
       WHERE conversation_id = v_dup;
    EXCEPTION WHEN unique_violation THEN
      DELETE FROM public.whatsapp_messages
       WHERE conversation_id = v_dup
         AND (account_id, message_id) IN (
           SELECT account_id, message_id
           FROM public.whatsapp_messages WHERE conversation_id = p_primary
         );
      UPDATE public.whatsapp_messages
         SET conversation_id = p_primary
       WHERE conversation_id = v_dup;
    END;

    -- Repoint automation control
    UPDATE public.whatsapp_automation_control
       SET conversation_id = p_primary
     WHERE conversation_id = v_dup;

    -- Consolidate timestamps / preview / remote_jid on primary
    UPDATE public.whatsapp_conversations p SET
      last_message_at = GREATEST(
        COALESCE(p.last_message_at, 'epoch'::timestamptz),
        COALESCE(v_dup_row.last_message_at, 'epoch'::timestamptz)
      ),
      last_customer_message_at = GREATEST(
        COALESCE(p.last_customer_message_at, 'epoch'::timestamptz),
        COALESCE(v_dup_row.last_customer_message_at, 'epoch'::timestamptz)
      ),
      last_message_preview = CASE
        WHEN COALESCE(v_dup_row.last_message_at, 'epoch'::timestamptz)
           > COALESCE(p.last_message_at, 'epoch'::timestamptz)
        THEN v_dup_row.last_message_preview
        ELSE p.last_message_preview
      END,
      last_message_is_from_me = CASE
        WHEN COALESCE(v_dup_row.last_message_at, 'epoch'::timestamptz)
           > COALESCE(p.last_message_at, 'epoch'::timestamptz)
        THEN v_dup_row.last_message_is_from_me
        ELSE p.last_message_is_from_me
      END,
      remote_jid = COALESCE(p.remote_jid, v_dup_row.remote_jid),
      lead_id = COALESCE(p.lead_id, v_dup_row.lead_id),
      client_id = COALESCE(p.client_id, v_dup_row.client_id),
      updated_at = now()
    WHERE p.id = p_primary;

    -- Reset NULL accumulators (GREATEST with epoch could leave epoch in)
    UPDATE public.whatsapp_conversations
       SET last_message_at = NULLIF(last_message_at, 'epoch'::timestamptz),
           last_customer_message_at = NULLIF(last_customer_message_at, 'epoch'::timestamptz)
     WHERE id = p_primary;

    -- Delete duplicate
    DELETE FROM public.whatsapp_conversations WHERE id = v_dup;

    -- Log
    INSERT INTO public.whatsapp_conversation_resolution_logs (
      account_id, agency_id, lead_id, old_conversation_id, new_conversation_id, action,
      phone_number, remote_jid, details
    ) VALUES (
      v_account, v_agency, v_lead, v_dup, p_primary, 'duplicate_conversation_merged',
      v_dup_row.phone_number, v_dup_row.remote_jid,
      jsonb_build_object('merged_at', now())
    );
  END LOOP;
END;
$$;

-- 3) One-shot cleanup of existing duplicates per (account_id, lead_id, context='lead')
DO $$
DECLARE
  g record;
  v_primary uuid;
  v_dups uuid[];
BEGIN
  FOR g IN
    SELECT account_id, lead_id
      FROM public.whatsapp_conversations
     WHERE lead_id IS NOT NULL
       AND COALESCE(context, 'lead') = 'lead'
     GROUP BY account_id, lead_id
    HAVING COUNT(*) > 1
  LOOP
    -- Elect primary: most messages → most recent last_message_at → most recent updated_at
    SELECT c.id INTO v_primary
      FROM public.whatsapp_conversations c
      LEFT JOIN (
        SELECT conversation_id, COUNT(*) AS msg_count
          FROM public.whatsapp_messages
         GROUP BY conversation_id
      ) m ON m.conversation_id = c.id
     WHERE c.account_id = g.account_id
       AND c.lead_id = g.lead_id
       AND COALESCE(c.context, 'lead') = 'lead'
     ORDER BY COALESCE(m.msg_count, 0) DESC,
              c.last_message_at DESC NULLS LAST,
              c.updated_at DESC NULLS LAST
     LIMIT 1;

    SELECT array_agg(c.id) INTO v_dups
      FROM public.whatsapp_conversations c
     WHERE c.account_id = g.account_id
       AND c.lead_id = g.lead_id
       AND COALESCE(c.context, 'lead') = 'lead'
       AND c.id <> v_primary;

    IF v_primary IS NOT NULL AND v_dups IS NOT NULL THEN
      PERFORM public.merge_whatsapp_conversations(v_primary, v_dups);
    END IF;
  END LOOP;
END $$;

-- 4) Unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_unique_lead_context
  ON public.whatsapp_conversations(account_id, lead_id, context)
  WHERE lead_id IS NOT NULL AND context = 'lead';
