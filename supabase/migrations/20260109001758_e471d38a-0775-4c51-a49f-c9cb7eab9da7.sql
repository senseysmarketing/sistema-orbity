-- 1. Remover status "Novo" incorreto criado manualmente
DELETE FROM lead_statuses 
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND name = 'Novo' 
AND is_system = false;

-- 2. Criar pagamentos de clientes para janeiro/2026 (MRR de R$ 42.500)
INSERT INTO client_payments (client_id, agency_id, amount, due_date, status, paid_date, description)
SELECT 
  c.id,
  c.agency_id,
  c.monthly_value,
  '2026-01-10'::date,
  CASE WHEN ROW_NUMBER() OVER (ORDER BY c.created_at) <= 8 THEN 'paid'::payment_status ELSE 'pending'::payment_status END,
  CASE WHEN ROW_NUMBER() OVER (ORDER BY c.created_at) <= 8 THEN '2026-01-08'::date ELSE NULL END,
  'Mensalidade Janeiro/2026'
FROM clients c
WHERE c.agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770'
  AND c.active = true
  AND c.monthly_value > 0;

-- 3. Atualizar leads com distribuição realística de status incluindo 'won'
-- Primeiro, atualizar 3 leads para 'won' com valores significativos
UPDATE leads 
SET status = 'won', value = 4500
WHERE id IN (
  SELECT id FROM leads 
  WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
  ORDER BY created_at DESC 
  LIMIT 3
);

-- 4 leads para 'proposal'
UPDATE leads 
SET status = 'proposal', value = 3500
WHERE id IN (
  SELECT id FROM leads 
  WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
  AND status != 'won'
  ORDER BY created_at DESC 
  LIMIT 4
);

-- 4 leads para 'meeting'
UPDATE leads 
SET status = 'meeting', value = 2500
WHERE id IN (
  SELECT id FROM leads 
  WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
  AND status NOT IN ('won', 'proposal')
  ORDER BY created_at DESC 
  LIMIT 4
);

-- 4 leads para 'scheduled'
UPDATE leads 
SET status = 'scheduled', value = 2000
WHERE id IN (
  SELECT id FROM leads 
  WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
  AND status NOT IN ('won', 'proposal', 'meeting')
  ORDER BY created_at DESC 
  LIMIT 4
);

-- 5 leads para 'qualified'
UPDATE leads 
SET status = 'qualified', value = 1500
WHERE id IN (
  SELECT id FROM leads 
  WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
  AND status NOT IN ('won', 'proposal', 'meeting', 'scheduled')
  ORDER BY created_at DESC 
  LIMIT 5
);

-- 5 leads permanecem como 'leads' (novos)
UPDATE leads 
SET status = 'leads', value = 1000
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND status NOT IN ('won', 'proposal', 'meeting', 'scheduled', 'qualified');

-- 4. Criar investimento manual para métricas de custo
INSERT INTO crm_investments (agency_id, reference_month, source, source_name, amount, notes, created_by)
VALUES (
  '546ccfe0-6fd5-4e57-840b-c7781383d770',
  '2026-01-01',
  'google_ads',
  'Google Ads',
  2000,
  'Investimento em Google Ads - Janeiro/2026',
  '03983e1d-4af6-4872-8a83-90933fb7c88e'
);

INSERT INTO crm_investments (agency_id, reference_month, source, source_name, amount, notes, created_by)
VALUES (
  '546ccfe0-6fd5-4e57-840b-c7781383d770',
  '2026-01-01',
  'other',
  'Marketing Orgânico',
  1500,
  'Investimento em conteúdo e SEO - Janeiro/2026',
  '03983e1d-4af6-4872-8a83-90933fb7c88e'
);