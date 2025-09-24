-- Create special "Senseys" plan (hidden from public)
INSERT INTO public.subscription_plans (
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_clients,
  max_leads,
  max_tasks,
  max_storage_gb,
  has_crm,
  has_advanced_reports,
  has_api_access,
  has_white_label,
  has_priority_support,
  is_active,
  sort_order
) VALUES (
  'Senseys',
  'senseys',
  'Plano especial interno com recursos ilimitados',
  0,
  0,
  999999,
  999999,
  999999,
  999999,
  999999,
  true,
  true,
  true,
  true,
  true,
  false, -- Hidden from public listing
  999
);

-- Get the plan ID for the Senseys plan
DO $$
DECLARE
  senseys_plan_id UUID;
BEGIN
  SELECT id INTO senseys_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'senseys';
  
  -- Remove any existing subscription for this agency
  DELETE FROM public.agency_subscriptions 
  WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
  
  -- Create active subscription for the specific agency
  INSERT INTO public.agency_subscriptions (
    agency_id,
    plan_id,
    status,
    billing_cycle,
    current_period_start,
    current_period_end
  ) VALUES (
    '7bef1258-af3d-48cc-b3a7-f79fac29c7c0',
    senseys_plan_id,
    'active',
    'monthly',
    now(),
    now() + INTERVAL '10 years' -- Long period to ensure it doesn't expire
  );
END $$;