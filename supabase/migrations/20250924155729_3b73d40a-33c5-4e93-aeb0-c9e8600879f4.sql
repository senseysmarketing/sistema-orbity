-- Update subscription plans with Stripe product and price IDs
UPDATE public.subscription_plans 
SET stripe_price_id_monthly = 'price_1SAv2DCP7hSC1lLOyvd4yp47' 
WHERE slug = 'basic';

UPDATE public.subscription_plans 
SET stripe_price_id_monthly = 'price_1SAv2UCP7hSC1lLOhUHFhJne' 
WHERE slug = 'pro';

UPDATE public.subscription_plans 
SET stripe_price_id_monthly = 'price_1SAv3NCP7hSC1lLOefY4gdlf' 
WHERE slug = 'enterprise';