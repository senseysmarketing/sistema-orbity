-- Update orbity_monthly with correct Stripe price
UPDATE public.subscription_plans
SET stripe_price_id_monthly = 'price_1TLqbBCLXDdhG50oXYQnIRz7',
    stripe_price_id_yearly = NULL
WHERE slug = 'orbity_monthly';

-- Update orbity_annual with correct Stripe price
UPDATE public.subscription_plans
SET stripe_price_id_monthly = NULL,
    stripe_price_id_yearly = 'price_1TLqbVCLXDdhG50olvvUBnzv'
WHERE slug = 'orbity_annual';

-- Ensure orbity_trial has no Stripe prices
UPDATE public.subscription_plans
SET stripe_price_id_monthly = NULL,
    stripe_price_id_yearly = NULL
WHERE slug = 'orbity_trial';