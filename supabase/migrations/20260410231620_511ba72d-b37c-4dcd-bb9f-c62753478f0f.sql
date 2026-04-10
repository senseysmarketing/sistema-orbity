ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS notify_via_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_via_whatsapp BOOLEAN DEFAULT true;