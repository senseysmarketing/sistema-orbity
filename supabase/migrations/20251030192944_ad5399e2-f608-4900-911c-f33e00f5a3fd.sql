-- Adicionar colunas de email pessoal e preferências do usuário
ALTER TABLE user_notification_channels 
ADD COLUMN IF NOT EXISTS email_address TEXT,
ADD COLUMN IF NOT EXISTS email_notification_types TEXT[] DEFAULT ARRAY['payment', 'task', 'meeting', 'lead', 'reminder', 'post', 'expense', 'system']::TEXT[];

-- Fixar configuração de email na tabela de integrações
UPDATE notification_integrations 
SET 
  email_from_name = 'Orbity',
  email_from_address = 'contato@orbityapp.com.br'
WHERE email_enabled = true;

-- Remover colunas de WhatsApp (limpeza)
ALTER TABLE notification_integrations 
DROP COLUMN IF EXISTS whatsapp_enabled,
DROP COLUMN IF EXISTS evolution_api_url,
DROP COLUMN IF EXISTS evolution_api_key,
DROP COLUMN IF EXISTS evolution_instance_name;

ALTER TABLE user_notification_channels
DROP COLUMN IF EXISTS whatsapp_enabled,
DROP COLUMN IF EXISTS whatsapp_phone;