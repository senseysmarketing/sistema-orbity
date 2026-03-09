
-- Insert conversations for the 7 recent leads (correct IDs)
INSERT INTO whatsapp_conversations (account_id, phone_number, lead_id)
VALUES
  ('de9c5180-369e-4287-922b-821a197fd367', '+5513996317120', 'c546a4f1-ae21-40b5-8354-586d40d5ac09'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5551998778423', '13050b67-102c-432b-a988-7abf06ca41de'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5521981566001', 'c2904576-598c-4dce-853c-d2d06bc87045'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5513988149272', '295bb68e-573c-424d-98ec-d5058de017d2'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5515997644369', '8ddaaf76-4295-4e0c-b93c-2a2c84901fe1'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5519991946424', 'cb9b08fb-6ad7-4fd7-a2ab-d3aef5b6ba85'),
  ('de9c5180-369e-4287-922b-821a197fd367', '+5514991227150', 'cfee87ba-6f78-458b-bde0-820f241df75f')
ON CONFLICT (account_id, phone_number) DO NOTHING;

-- Insert automation control records for immediate processing by cron
INSERT INTO whatsapp_automation_control (account_id, lead_id, status, current_phase, current_step_position, next_execution_at, conversation_state, conversation_id)
SELECT 
  'de9c5180-369e-4287-922b-821a197fd367',
  l.id,
  'active',
  'greeting',
  1,
  NOW(),
  'new_lead',
  wc.id
FROM (
  VALUES 
    ('c546a4f1-ae21-40b5-8354-586d40d5ac09'::uuid),
    ('13050b67-102c-432b-a988-7abf06ca41de'::uuid),
    ('c2904576-598c-4dce-853c-d2d06bc87045'::uuid),
    ('295bb68e-573c-424d-98ec-d5058de017d2'::uuid),
    ('8ddaaf76-4295-4e0c-b93c-2a2c84901fe1'::uuid),
    ('cb9b08fb-6ad7-4fd7-a2ab-d3aef5b6ba85'::uuid),
    ('cfee87ba-6f78-458b-bde0-820f241df75f'::uuid)
) AS l(id)
JOIN whatsapp_conversations wc ON wc.lead_id = l.id AND wc.account_id = 'de9c5180-369e-4287-922b-821a197fd367';
