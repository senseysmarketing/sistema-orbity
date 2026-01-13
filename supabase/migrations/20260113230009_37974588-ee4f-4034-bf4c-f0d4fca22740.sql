-- Drop existing view
DROP VIEW IF EXISTS public.master_agency_overview;

-- Recreate with price and billing_cycle fields for MRR calculation
CREATE OR REPLACE VIEW public.master_agency_overview AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.slug,
  a.is_active,
  a.created_at,
  a.contact_email,
  a.contact_phone,
  asub.status as subscription_status,
  asub.trial_end,
  asub.trial_start,
  asub.current_period_end,
  asub.billing_cycle,
  sp.name as plan_name,
  sp.slug as plan_slug,
  sp.price_monthly,
  sp.price_yearly,
  CASE 
    WHEN a.is_active = false THEN 'suspended'
    WHEN asub.status = 'trial' AND asub.trial_end < now() THEN 'trial_expired'
    WHEN asub.status = 'trial' THEN 'trialing'
    WHEN asub.status = 'past_due' THEN 'past_due'
    WHEN asub.status = 'canceled' THEN 'canceled'
    WHEN asub.status = 'active' THEN 'active'
    ELSE 'unknown'
  END as computed_status,
  (SELECT COUNT(*) FROM public.agency_users au WHERE au.agency_id = a.id) as user_count,
  (SELECT COUNT(*) FROM public.clients c WHERE c.agency_id = a.id) as client_count,
  (SELECT COUNT(*) FROM public.tasks t WHERE t.agency_id = a.id) as task_count,
  (SELECT COALESCE(SUM(bh.amount), 0) FROM public.billing_history bh WHERE bh.agency_id = a.id AND bh.status = 'paid') as total_revenue
FROM public.agencies a
LEFT JOIN public.agency_subscriptions asub ON a.id = asub.agency_id
LEFT JOIN public.subscription_plans sp ON asub.plan_id = sp.id
WHERE public.is_master_agency_admin();

-- Create view for billing metrics aggregation
CREATE OR REPLACE VIEW public.master_billing_metrics AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'paid') as total_payments,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_revenue_received,
  COUNT(*) FILTER (WHERE status = 'paid' AND paid_date >= date_trunc('month', NOW())) as payments_this_month,
  COALESCE(SUM(amount) FILTER (WHERE status = 'paid' AND paid_date >= date_trunc('month', NOW())), 0) as revenue_this_month
FROM public.billing_history
WHERE public.is_master_agency_admin();