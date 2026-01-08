-- Atualizar webhooks existentes para usar os novos valores de temperatura/prioridade
UPDATE agency_webhooks 
SET headers = jsonb_set(
  COALESCE(headers::jsonb, '{}'::jsonb),
  '{default_values}',
  jsonb_build_object(
    'status', COALESCE(headers::jsonb->'default_values'->>'status', 'new'),
    'temperature', 'cold',
    'source', COALESCE(headers::jsonb->'default_values'->>'source', 'webhook')
  )
)
WHERE events @> ARRAY['lead_capture']::text[];