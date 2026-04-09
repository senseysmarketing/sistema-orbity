ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;