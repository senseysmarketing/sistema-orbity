ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_secret_key TEXT,
  ADD COLUMN IF NOT EXISTS stripe_webhook_secret TEXT,
  ADD COLUMN IF NOT EXISTS active_payment_gateway TEXT DEFAULT 'asaas';

ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT;

CREATE INDEX IF NOT EXISTS idx_client_payments_stripe_pi
  ON public.client_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_payments_stripe_cs
  ON public.client_payments(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;