
-- Deactivate legacy plans
UPDATE public.subscription_plans SET is_active = false WHERE slug IN ('basic', 'professional', 'enterprise');

-- Insert Orbity Monthly plan
INSERT INTO public.subscription_plans (
  slug, name, is_active, price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  has_crm, has_advanced_reports, has_api_access, has_white_label, has_priority_support
)
SELECT
  'orbity_monthly', 'Orbity Mensal - Acesso Completo', true, 397, NULL,
  stripe_price_id_monthly, NULL,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  true, true, true, true, true
FROM public.subscription_plans WHERE slug = 'basic'
ON CONFLICT DO NOTHING;

-- Insert Orbity Annual plan
INSERT INTO public.subscription_plans (
  slug, name, is_active, price_monthly, price_yearly,
  stripe_price_id_monthly, stripe_price_id_yearly,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  has_crm, has_advanced_reports, has_api_access, has_white_label, has_priority_support
)
SELECT
  'orbity_annual', 'Orbity Anual - Acesso Completo', true, 297, 3564,
  NULL, stripe_price_id_monthly,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  true, true, true, true, true
FROM public.subscription_plans WHERE slug = 'basic'
ON CONFLICT DO NOTHING;

-- Insert Orbity Trial plan (used for PLG trial flow)
INSERT INTO public.subscription_plans (
  slug, name, is_active, price_monthly, price_yearly,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  has_crm, has_advanced_reports, has_api_access, has_white_label, has_priority_support
)
SELECT
  'orbity_trial', 'Orbity - Acesso Completo (Trial)', true, 0, NULL,
  max_users, max_clients, max_leads, max_tasks, max_storage_gb,
  true, true, true, true, true
FROM public.subscription_plans WHERE slug = 'basic'
ON CONFLICT DO NOTHING;

-- Update the DB function that initializes agency subscriptions to use orbity_trial
CREATE OR REPLACE FUNCTION public.initialize_agency_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trial_plan_id UUID;
BEGIN
  SELECT id INTO trial_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'orbity_trial' AND is_active = true 
  LIMIT 1;
  
  IF trial_plan_id IS NULL THEN
    -- Fallback: try basic
    SELECT id INTO trial_plan_id 
    FROM public.subscription_plans 
    WHERE slug = 'basic' 
    LIMIT 1;
  END IF;
  
  INSERT INTO public.agency_subscriptions (
    agency_id, plan_id, status, trial_start, trial_end, billing_cycle
  ) VALUES (
    NEW.id, trial_plan_id, 'trial', now(), now() + INTERVAL '7 days', 'monthly'
  );
  
  RETURN NEW;
END;
$$;

-- Update start_agency_trial to default to orbity_trial
CREATE OR REPLACE FUNCTION public.start_agency_trial(p_agency_id uuid, p_plan_slug text DEFAULT 'orbity_trial')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  SELECT id INTO v_plan_id 
  FROM public.subscription_plans 
  WHERE slug = p_plan_slug AND is_active = true 
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_slug;
  END IF;
  
  INSERT INTO public.agency_subscriptions (
    agency_id, plan_id, status, trial_start, trial_end, billing_cycle
  ) VALUES (
    p_agency_id, v_plan_id, 'trial', now(), now() + INTERVAL '7 days', 'monthly'
  );
END;
$$;
