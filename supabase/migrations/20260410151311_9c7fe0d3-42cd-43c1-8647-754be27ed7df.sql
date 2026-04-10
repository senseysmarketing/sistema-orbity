-- 1. Update Check Constraint to allow 'conexa'
ALTER TABLE public.agency_payment_settings 
  DROP CONSTRAINT IF EXISTS agency_payment_settings_active_gateway_check;

ALTER TABLE public.agency_payment_settings 
  ADD CONSTRAINT agency_payment_settings_active_gateway_check 
  CHECK (active_gateway IN ('manual', 'asaas', 'conexa'));

-- 2. Add Conexa integration keys
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_api_key TEXT,
  ADD COLUMN IF NOT EXISTS conexa_token TEXT;

-- 3. Add Conexa customer ID to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS conexa_customer_id TEXT;

-- 4. Add Conexa charge columns to payments
ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS conexa_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS conexa_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS conexa_pix_copy_paste TEXT;