ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS report_date_from DATE,
  ADD COLUMN IF NOT EXISTS report_date_to DATE,
  ADD COLUMN IF NOT EXISTS report_ad_account_id TEXT;