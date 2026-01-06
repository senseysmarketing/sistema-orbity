-- Adicionar campos de cache na tabela selected_ad_accounts
ALTER TABLE selected_ad_accounts 
ADD COLUMN IF NOT EXISTS last_campaign_update timestamp with time zone,
ADD COLUMN IF NOT EXISTS active_campaigns_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_daily_budget numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_7d_spend numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_threshold numeric DEFAULT 100;