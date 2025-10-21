-- Add missing stripe_price_id column to agency_subscriptions
ALTER TABLE public.agency_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_agency_subscriptions_stripe_price_id 
ON public.agency_subscriptions(stripe_price_id);