-- Adicionar campo pixel_id na tabela facebook_lead_integrations
ALTER TABLE facebook_lead_integrations 
ADD COLUMN IF NOT EXISTS pixel_id TEXT;