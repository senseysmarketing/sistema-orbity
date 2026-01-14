-- Corrigir o valor default da coluna status na tabela leads
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'leads';

-- Atualizar configurações de webhooks que têm status inválido 'new'
UPDATE agency_webhooks
SET headers = jsonb_set(
  COALESCE(headers, '{}'::jsonb),
  '{default_values,status}',
  '"leads"'
)
WHERE headers::jsonb->'default_values'->>'status' = 'new';