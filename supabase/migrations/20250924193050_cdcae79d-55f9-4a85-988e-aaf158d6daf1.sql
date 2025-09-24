-- Update subscription plans with correct Stripe price IDs and values

-- Update Basic plan
UPDATE public.subscription_plans 
SET 
  price_monthly = 97.00,
  stripe_price_id_monthly = 'price_1SAyNoCP7hSC1lLOejjEUVuK'
WHERE slug = 'basic';

-- Update Professional plan  
UPDATE public.subscription_plans 
SET 
  price_monthly = 197.00,
  stripe_price_id_monthly = 'price_1SAyO3CP7hSC1lLORdfC1PxS'
WHERE slug = 'professional';

-- Update Enterprise plan
UPDATE public.subscription_plans 
SET 
  price_monthly = 597.00,
  stripe_price_id_monthly = 'price_1SAyOOCP7hSC1lLOmsU9Wo34'
WHERE slug = 'enterprise';