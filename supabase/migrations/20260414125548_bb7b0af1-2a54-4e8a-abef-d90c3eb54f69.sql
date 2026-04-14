ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_subdomain TEXT,
  ADD COLUMN IF NOT EXISTS conexa_default_product_id INTEGER;