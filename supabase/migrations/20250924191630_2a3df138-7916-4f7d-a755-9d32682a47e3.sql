-- First, update any agencies from free plan to basic plan
UPDATE public.agency_subscriptions 
SET plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE slug = 'basic' 
  LIMIT 1
)
WHERE plan_id = (
  SELECT id FROM public.subscription_plans 
  WHERE slug = 'free' 
  LIMIT 1
);

-- Update trial period to 7 days for all existing subscriptions
UPDATE public.agency_subscriptions 
SET trial_end = trial_start + INTERVAL '7 days'
WHERE status = 'trial' AND trial_start IS NOT NULL;

-- Update Basic plan (slug: basic)
UPDATE public.subscription_plans 
SET 
  description = 'Ideal para pequenas agências',
  price_monthly = 97.00,
  price_yearly = 970.00,
  max_users = 5,
  max_clients = 20,
  max_leads = 300,
  max_tasks = 500,
  max_storage_gb = 10,
  has_crm = true,
  has_advanced_reports = true,
  has_api_access = false,
  has_white_label = false,
  has_priority_support = false,
  sort_order = 1,
  is_active = true
WHERE slug = 'basic';

-- Update Professional plan (slug: pro to professional)
UPDATE public.subscription_plans 
SET 
  name = 'Profissional',
  slug = 'professional',
  description = 'Para agências em crescimento',
  price_monthly = 197.00,
  price_yearly = 1970.00,
  max_users = 10,
  max_clients = 50,
  max_leads = 500,
  max_tasks = 800,
  max_storage_gb = 50,
  has_crm = true,
  has_advanced_reports = true,
  has_api_access = true,
  has_white_label = false,
  has_priority_support = true,
  sort_order = 2,
  is_active = true
WHERE slug = 'pro';

-- Update Enterprise plan
UPDATE public.subscription_plans 
SET 
  description = 'Solução completa para grandes agências',
  price_monthly = 597.00,
  price_yearly = 5970.00,
  max_users = 999999,
  max_clients = 999999,
  max_leads = 999999,
  max_tasks = 999999,
  max_storage_gb = 1000,
  has_crm = true,
  has_advanced_reports = true,
  has_api_access = true,
  has_white_label = true,
  has_priority_support = true,
  sort_order = 3,
  is_active = true
WHERE slug = 'enterprise';

-- Deactivate the free plan
UPDATE public.subscription_plans 
SET is_active = false 
WHERE slug = 'free';

-- Update the initialize_agency_subscription function to use basic plan
CREATE OR REPLACE FUNCTION public.initialize_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  basic_plan_id UUID;
BEGIN
  -- Get the basic plan ID
  SELECT id INTO basic_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'basic' AND is_active = true 
  LIMIT 1;
  
  -- Create subscription with 7-day trial
  INSERT INTO public.agency_subscriptions (
    agency_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    billing_cycle
  ) VALUES (
    NEW.id,
    basic_plan_id,
    'trial',
    now(),
    now() + INTERVAL '7 days',
    'monthly'
  );
  
  RETURN NEW;
END;
$function$;

-- Update the start_agency_trial function to default to basic plan with 7 days
CREATE OR REPLACE FUNCTION public.start_agency_trial(p_agency_id uuid, p_plan_slug text DEFAULT 'basic'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Get the plan ID
  SELECT id INTO v_plan_id 
  FROM public.subscription_plans 
  WHERE slug = p_plan_slug AND is_active = true 
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_slug;
  END IF;
  
  -- Create trial subscription with 7 days
  INSERT INTO public.agency_subscriptions (
    agency_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    billing_cycle
  ) VALUES (
    p_agency_id,
    v_plan_id,
    'trial',
    now(),
    now() + INTERVAL '7 days',
    'monthly'
  );
END;
$function$;