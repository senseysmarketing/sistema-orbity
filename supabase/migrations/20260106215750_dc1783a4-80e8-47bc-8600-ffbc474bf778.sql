-- Adicionar campos para suportar contas pré-pagas e pós-pagas
ALTER TABLE public.selected_ad_accounts
ADD COLUMN IF NOT EXISTS is_prepaid BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS spend_cap NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS amount_spent NUMERIC DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.selected_ad_accounts.is_prepaid IS 'True para contas pré-pagas (maioria), false para pós-pagas';
COMMENT ON COLUMN public.selected_ad_accounts.spend_cap IS 'Limite mensal da conta (para contas pós-pagas)';
COMMENT ON COLUMN public.selected_ad_accounts.amount_spent IS 'Gasto acumulado no período (para contas pós-pagas)';