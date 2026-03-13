-- Migration: Fix WhatsApp conversation duplicates and stuck automations
--
-- Root cause: Evolution API sends phone numbers as digits-only (e.g. "5527992661416"),
-- but startAutomation stored conversations with the lead's phone format which may include
-- "+" prefix or spaces (e.g. "+5527992661416"). This caused the webhook to create a second
-- "orphaned" conversation (no lead_id) where customer replies were stored, while the
-- automation's conversation_id still pointed to the original (no customer reply data).
-- Result: automations kept sending follow-ups even after the lead had already responded.
--
-- This migration:
--   1. Merges messages from orphaned conversations into their lead-linked counterparts
--   2. Updates last_customer_message_at on the lead-linked conversations
--   3. Fixes automation conversation_id references
--   4. Marks automations as 'responded' where the customer clearly replied
--   5. Normalizes all phone_numbers to digits-only for consistency

DO $$
DECLARE
  r RECORD;
BEGIN

  -- -----------------------------------------------------------------------
  -- STEP 1-4: Merge orphaned conversations into lead-linked ones
  --
  -- An "orphaned" conversation has lead_id IS NULL but its phone_number
  -- normalizes to the same digits as a conversation that HAS a lead_id.
  -- -----------------------------------------------------------------------
  FOR r IN (
    SELECT
      cl.id                       AS lead_conv_id,
      co.id                       AS orphan_conv_id,
      cl.lead_id,
      cl.account_id,
      co.last_customer_message_at AS orphan_reply_at,
      co.last_message_at          AS orphan_last_msg_at,
      co.last_message_is_from_me  AS orphan_last_from_me
    FROM whatsapp_conversations cl
    JOIN whatsapp_conversations co
      ON  co.account_id = cl.account_id
      AND co.lead_id IS NULL
      AND co.id != cl.id
      AND regexp_replace(co.phone_number, '[^0-9]', '', 'g')
        = regexp_replace(cl.phone_number, '[^0-9]', '', 'g')
    WHERE cl.lead_id IS NOT NULL
  )
  LOOP
    -- Move messages from orphaned conv to lead-linked conv.
    -- Skip messages whose message_id already exists in the destination to avoid duplicates.
    UPDATE whatsapp_messages
    SET conversation_id = r.lead_conv_id
    WHERE conversation_id = r.orphan_conv_id
      AND NOT EXISTS (
        SELECT 1 FROM whatsapp_messages dup
        WHERE dup.conversation_id = r.lead_conv_id
          AND dup.message_id = whatsapp_messages.message_id
      );

    -- Update timestamps on the lead-linked conversation
    UPDATE whatsapp_conversations
    SET
      last_customer_message_at = GREATEST(last_customer_message_at, r.orphan_reply_at),
      last_message_at          = GREATEST(last_message_at, r.orphan_last_msg_at),
      last_message_is_from_me  = CASE
        WHEN r.orphan_last_msg_at > COALESCE(last_message_at, '1970-01-01'::timestamptz)
        THEN r.orphan_last_from_me
        ELSE last_message_is_from_me
      END
    WHERE id = r.lead_conv_id;

    -- Fix any automation that was pointing to the orphaned conversation
    UPDATE whatsapp_automation_control
    SET conversation_id = r.lead_conv_id
    WHERE account_id    = r.account_id
      AND lead_id       = r.lead_id
      AND conversation_id = r.orphan_conv_id;

    -- Delete the now-empty orphaned conversation
    DELETE FROM whatsapp_conversations WHERE id = r.orphan_conv_id;

  END LOOP;

  -- -----------------------------------------------------------------------
  -- STEP 5: Mark stuck automations as 'responded' where customer replied
  --
  -- After merging conversations, the lead-linked conversation now has
  -- last_customer_message_at set. Any active automation where the customer
  -- replied after the automation started should be marked as responded.
  -- -----------------------------------------------------------------------
  UPDATE whatsapp_automation_control ac
  SET
    status             = 'responded',
    conversation_state = 'customer_replied',
    updated_at         = now()
  FROM whatsapp_conversations c
  WHERE c.id = ac.conversation_id
    AND ac.status IN ('active', 'processing')
    AND c.last_customer_message_at IS NOT NULL
    AND c.last_customer_message_at > COALESCE(
      ac.last_followup_sent_at,
      ac.started_at,
      ac.updated_at
    );

  -- -----------------------------------------------------------------------
  -- STEP 6: Normalize all phone_numbers to digits-only
  --
  -- Removes "+", spaces, dashes, parentheses so future webhook lookups
  -- always match regardless of how the phone was originally stored.
  -- -----------------------------------------------------------------------
  UPDATE whatsapp_conversations
  SET phone_number = regexp_replace(phone_number, '[^0-9]', '', 'g')
  WHERE phone_number ~ '[^0-9]';

END $$;
