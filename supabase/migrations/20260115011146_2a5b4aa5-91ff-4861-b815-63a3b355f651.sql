-- Renomear coluna priority para temperature na tabela leads
ALTER TABLE leads RENAME COLUMN priority TO temperature;

-- Atualizar valores antigos inválidos (low, medium, high -> cold, warm, hot)
UPDATE leads SET temperature = 'cold' WHERE temperature NOT IN ('cold', 'warm', 'hot') OR temperature IS NULL;
UPDATE leads SET temperature = 'cold' WHERE temperature = 'low';
UPDATE leads SET temperature = 'warm' WHERE temperature = 'medium';
UPDATE leads SET temperature = 'hot' WHERE temperature = 'high';

-- Alterar default para 'cold'
ALTER TABLE leads ALTER COLUMN temperature SET DEFAULT 'cold';

-- Adicionar constraint para garantir valores válidos
ALTER TABLE leads ADD CONSTRAINT leads_temperature_check CHECK (temperature IN ('cold', 'warm', 'hot'));