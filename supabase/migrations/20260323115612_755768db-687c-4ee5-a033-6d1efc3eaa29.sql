
DO $$
DECLARE
  wa_account_id uuid := 'a89cf7ee-fe68-487a-b6b1-15a9272012a3';
  lead_rec record;
  conv_id uuid;
  phone_digits text;
BEGIN
  FOR lead_rec IN
    SELECT l.id, l.name, l.phone
    FROM leads l
    WHERE l.id IN (
      '4301553c-c676-427f-849a-8f8e56d944b4',
      '24c1dc9b-3dbd-4ee4-bba6-05dcd1219693',
      '871efa58-db4f-436a-980e-778264bbd82e',
      '5352c7b8-33b8-44a5-8ede-5448c2301f4e',
      'fe3d3b78-3b20-4dcc-90b7-03db6e1b41c4',
      '0b9d621c-621e-420d-b93e-aee26fd246f0',
      'cd544cfe-535a-4b09-a6c5-6fb9484f1a81',
      '479b8f38-6f1d-4b82-81d3-427c2ac83bfb',
      '05d892b6-9c97-4822-839d-59f05a005c0f',
      '5c378344-281b-4c91-a5ef-d10c0a83ef29',
      '43a4a4c8-4da0-4e9f-93b1-9301c321bf85',
      '6b777dc1-27a4-4ca5-8a5a-3cfbe36a4360'
    )
    AND NOT EXISTS (
      SELECT 1 FROM whatsapp_automation_control wac WHERE wac.lead_id = l.id
    )
  LOOP
    phone_digits := regexp_replace(lead_rec.phone, '\D', '', 'g');
    
    -- Try to find existing conversation by lead_id first, then by phone
    SELECT wc.id INTO conv_id
    FROM whatsapp_conversations wc
    WHERE wc.account_id = wa_account_id 
      AND (wc.lead_id = lead_rec.id OR wc.phone_number = phone_digits)
    LIMIT 1;
    
    IF conv_id IS NOT NULL THEN
      -- Link conversation to lead if not linked yet
      UPDATE whatsapp_conversations SET lead_id = lead_rec.id WHERE id = conv_id AND lead_id IS NULL;
    ELSE
      INSERT INTO whatsapp_conversations (account_id, phone_number, lead_id)
      VALUES (wa_account_id, phone_digits, lead_rec.id)
      RETURNING id INTO conv_id;
    END IF;
    
    INSERT INTO whatsapp_automation_control (
      account_id, lead_id, conversation_id, status,
      current_phase, current_step_position,
      next_execution_at, conversation_state
    ) VALUES (
      wa_account_id, lead_rec.id, conv_id, 'active',
      'greeting', 1, now(), 'new_lead'
    );
    
    RAISE NOTICE 'Created automation for lead % (%)', lead_rec.name, lead_rec.id;
  END LOOP;
END;
$$;
