ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_account_id integer,
  ADD COLUMN IF NOT EXISTS conexa_receiving_method_id integer;