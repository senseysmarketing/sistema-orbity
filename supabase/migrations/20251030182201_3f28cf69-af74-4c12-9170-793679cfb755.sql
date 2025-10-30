-- Tabela para armazenar configurações de integração por agência
CREATE TABLE IF NOT EXISTS public.notification_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- WhatsApp via Evolution API
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_provider TEXT DEFAULT 'evolution_api',
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  evolution_instance_name TEXT,
  
  -- Email via Resend
  email_enabled BOOLEAN DEFAULT false,
  email_provider TEXT DEFAULT 'resend',
  email_from_name TEXT,
  email_from_address TEXT,
  
  -- Discord
  discord_enabled BOOLEAN DEFAULT false,
  discord_webhook_url TEXT,
  
  -- Slack
  slack_enabled BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  slack_channel TEXT,
  
  -- Webhook Genérico
  custom_webhook_enabled BOOLEAN DEFAULT false,
  custom_webhook_url TEXT,
  custom_webhook_method TEXT DEFAULT 'POST',
  custom_webhook_headers JSONB DEFAULT '{}'::jsonb,
  custom_webhook_template JSONB DEFAULT '{}'::jsonb,
  custom_webhook_auth_type TEXT DEFAULT 'none',
  custom_webhook_auth_value TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(agency_id)
);

-- Tabela para preferências de canal por usuário
CREATE TABLE IF NOT EXISTS public.user_notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  
  -- Canais habilitados para este usuário
  in_app_enabled BOOLEAN DEFAULT true,
  browser_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  discord_enabled BOOLEAN DEFAULT false,
  slack_enabled BOOLEAN DEFAULT false,
  custom_webhook_enabled BOOLEAN DEFAULT false,
  
  -- Dados de contato por canal
  whatsapp_phone TEXT,
  discord_user_id TEXT,
  slack_user_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, agency_id)
);

-- Tabela para logs de envio de notificações
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notification_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para notification_integrations
CREATE POLICY "Agency admins can manage integrations"
  ON public.notification_integrations
  FOR ALL
  USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view integrations"
  ON public.notification_integrations
  FOR SELECT
  USING (user_belongs_to_agency(agency_id));

-- Políticas para user_notification_channels
CREATE POLICY "Users can manage their own channel preferences"
  ON public.user_notification_channels
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own channel preferences"
  ON public.user_notification_channels
  FOR SELECT
  USING (auth.uid() = user_id);

-- Políticas para notification_delivery_logs
CREATE POLICY "Users can view their own delivery logs"
  ON public.notification_delivery_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert delivery logs"
  ON public.notification_delivery_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Agency admins can view all delivery logs"
  ON public.notification_delivery_logs
  FOR SELECT
  USING (is_agency_admin(agency_id));

-- Trigger para updated_at
CREATE TRIGGER update_notification_integrations_updated_at
  BEFORE UPDATE ON public.notification_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_channels_updated_at
  BEFORE UPDATE ON public.user_notification_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();