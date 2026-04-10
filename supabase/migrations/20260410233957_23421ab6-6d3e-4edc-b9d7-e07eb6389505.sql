
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS default_fine_percentage NUMERIC DEFAULT 2.00,
  ADD COLUMN IF NOT EXISTS default_interest_percentage NUMERIC DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS discount_days_before INTEGER DEFAULT 0;
