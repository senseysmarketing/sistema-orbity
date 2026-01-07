-- Atualizar valores existentes de priority para o novo sistema de temperatura
UPDATE leads SET priority = 'cold' WHERE priority = 'low';
UPDATE leads SET priority = 'warm' WHERE priority = 'medium';
UPDATE leads SET priority = 'hot' WHERE priority = 'high';

-- Remover constraint antiga se existir e adicionar nova
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_priority_check;
ALTER TABLE leads ADD CONSTRAINT leads_priority_check 
  CHECK (priority IN ('cold', 'warm', 'hot'));