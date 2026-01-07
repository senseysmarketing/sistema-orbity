-- Adicionar coluna para gasto do mês atual em contas pós-pagas
ALTER TABLE selected_ad_accounts 
ADD COLUMN IF NOT EXISTS current_month_spend DECIMAL(12,2) DEFAULT 0;