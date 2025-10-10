-- Remover a referência de client_id da tabela traffic_controls
-- e adicionar referência para ad_account_id

ALTER TABLE traffic_controls 
DROP COLUMN IF EXISTS client_id;

ALTER TABLE traffic_controls
ADD COLUMN ad_account_id TEXT;

-- Comentário explicativo
COMMENT ON COLUMN traffic_controls.ad_account_id IS 'ID da conta de anúncios do Facebook (account ID da selected_ad_accounts)';

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_traffic_controls_ad_account 
ON traffic_controls(ad_account_id);

-- Adicionar índice na tabela selected_ad_accounts para melhor performance
CREATE INDEX IF NOT EXISTS idx_selected_ad_accounts_id 
ON selected_ad_accounts(ad_account_id);