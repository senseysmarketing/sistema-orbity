-- Remove a constraint de status fixo da tabela leads para permitir status personalizados
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;