-- Remover constraint antiga de status
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Atualizar status existentes na tabela lead_statuses
UPDATE lead_statuses SET name = 'Leads', order_position = 1 WHERE name = 'Novo';
UPDATE lead_statuses SET name = 'Qualificados', order_position = 2 WHERE name = 'Qualificado';
UPDATE lead_statuses SET name = 'Vendas', order_position = 6 WHERE name = 'Ganho';

-- Inserir novos status intermediários (para cada agência que já tem status)
INSERT INTO lead_statuses (agency_id, name, color, order_position, is_default, is_system)
SELECT DISTINCT agency_id, 'Agendamentos', 'bg-yellow-500', 3, true, true
FROM lead_statuses ls
WHERE NOT EXISTS (
  SELECT 1 FROM lead_statuses ls2 
  WHERE ls2.agency_id = ls.agency_id AND ls2.name = 'Agendamentos'
);

INSERT INTO lead_statuses (agency_id, name, color, order_position, is_default, is_system)
SELECT DISTINCT agency_id, 'Reuniões', 'bg-orange-500', 4, true, true
FROM lead_statuses ls
WHERE NOT EXISTS (
  SELECT 1 FROM lead_statuses ls2 
  WHERE ls2.agency_id = ls.agency_id AND ls2.name = 'Reuniões'
);

INSERT INTO lead_statuses (agency_id, name, color, order_position, is_default, is_system)
SELECT DISTINCT agency_id, 'Propostas', 'bg-pink-500', 5, true, true
FROM lead_statuses ls
WHERE NOT EXISTS (
  SELECT 1 FROM lead_statuses ls2 
  WHERE ls2.agency_id = ls.agency_id AND ls2.name = 'Propostas'
);

-- Atualizar leads existentes para novos status
UPDATE leads SET status = 'leads' WHERE status = 'new';

-- Adicionar nova constraint com todos os status válidos
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
CHECK (status IN ('leads', 'qualified', 'scheduled', 'meeting', 'proposal', 'won', 'lost'));