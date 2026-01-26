-- Adicionar colunas post_date e due_date
ALTER TABLE public.social_media_posts
ADD COLUMN IF NOT EXISTS post_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- Migrar dados existentes: scheduled_date -> post_date
UPDATE public.social_media_posts
SET post_date = scheduled_date
WHERE post_date IS NULL AND scheduled_date IS NOT NULL;

-- Calcular due_date = post_date - 3 dias (default)
UPDATE public.social_media_posts
SET due_date = post_date - INTERVAL '3 days'
WHERE due_date IS NULL AND post_date IS NOT NULL;

-- Adicionar configuração de dias de antecedência por agência
CREATE TABLE IF NOT EXISTS public.social_media_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  default_due_date_days_before INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- RLS para social_media_settings
ALTER TABLE public.social_media_settings ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver settings da sua agência
CREATE POLICY "Users can view settings of their agency"
  ON public.social_media_settings FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid()));

-- Política: Admins podem inserir settings
CREATE POLICY "Admins can insert settings"
  ON public.social_media_settings FOR INSERT
  WITH CHECK (agency_id IN (
    SELECT agency_id FROM agency_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Política: Admins podem atualizar settings
CREATE POLICY "Admins can update settings"
  ON public.social_media_settings FOR UPDATE
  USING (agency_id IN (
    SELECT agency_id FROM agency_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Política: Admins podem deletar settings
CREATE POLICY "Admins can delete settings"
  ON public.social_media_settings FOR DELETE
  USING (agency_id IN (
    SELECT agency_id FROM agency_users 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  ));

-- Trigger para updated_at
CREATE TRIGGER update_social_media_settings_updated_at
  BEFORE UPDATE ON public.social_media_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();