-- Add per-gateway billing columns to agency_payment_settings
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS manual_billing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_template_reminder text,
  ADD COLUMN IF NOT EXISTS manual_template_overdue text,
  ADD COLUMN IF NOT EXISTS conexa_billing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS conexa_template_reminder text,
  ADD COLUMN IF NOT EXISTS conexa_template_overdue text,
  ADD COLUMN IF NOT EXISTS asaas_billing_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS asaas_template_reminder text,
  ADD COLUMN IF NOT EXISTS asaas_template_overdue text;

-- Add per-client billing automation toggle
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_automation_enabled boolean DEFAULT true;

-- Retrocompatibility: copy old global templates to the active gateway's new columns
UPDATE public.agency_payment_settings
SET
  manual_template_reminder = CASE WHEN active_gateway = 'manual' THEN whatsapp_template_reminder END,
  manual_template_overdue  = CASE WHEN active_gateway = 'manual' THEN whatsapp_template_overdue END,
  conexa_template_reminder = CASE WHEN active_gateway = 'conexa' THEN whatsapp_template_reminder END,
  conexa_template_overdue  = CASE WHEN active_gateway = 'conexa' THEN whatsapp_template_overdue END,
  asaas_template_reminder  = CASE WHEN active_gateway = 'asaas'  THEN whatsapp_template_reminder END,
  asaas_template_overdue   = CASE WHEN active_gateway = 'asaas'  THEN whatsapp_template_overdue END,
  manual_billing_enabled = CASE WHEN active_gateway = 'manual' AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END,
  conexa_billing_enabled = CASE WHEN active_gateway = 'conexa' AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END,
  asaas_billing_enabled  = CASE WHEN active_gateway = 'asaas'  AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END
WHERE whatsapp_template_reminder IS NOT NULL OR whatsapp_template_overdue IS NOT NULL;