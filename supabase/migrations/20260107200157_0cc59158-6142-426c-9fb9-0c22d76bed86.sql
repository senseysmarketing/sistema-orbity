-- Add field to store the selected ad account for CRM investment metrics
ALTER TABLE agencies 
ADD COLUMN IF NOT EXISTS crm_ad_account_id UUID REFERENCES selected_ad_accounts(id) ON DELETE SET NULL;