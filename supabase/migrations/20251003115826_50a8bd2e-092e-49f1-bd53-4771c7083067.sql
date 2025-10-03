-- Criar tabela para armazenar configurações de limites de recarga por conta
CREATE TABLE IF NOT EXISTS public.ad_account_balance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  min_threshold NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, ad_account_id)
);

-- Enable RLS
ALTER TABLE public.ad_account_balance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agency admins can manage balance settings"
  ON public.ad_account_balance_settings
  FOR ALL
  USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view balance settings"
  ON public.ad_account_balance_settings
  FOR SELECT
  USING (user_belongs_to_agency(agency_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ad_account_balance_settings_updated_at
  BEFORE UPDATE ON public.ad_account_balance_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();