-- Drop existing view
DROP VIEW IF EXISTS public.master_agency_overview;

-- Create optimized view with trial_end and computed_status
CREATE VIEW public.master_agency_overview
WITH (security_barrier = true, security_invoker = false)
AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.created_at,
  a.is_active,
  COALESCE(user_counts.user_count, 0)::integer as user_count,
  COALESCE(client_counts.client_count, 0)::integer as client_count,
  COALESCE(task_counts.task_count, 0)::integer as task_count,
  COALESCE(payment_totals.total_revenue, 0)::numeric as total_revenue,
  sp.name as subscription_plan,
  asub.status as subscription_status,
  asub.current_period_end,
  asub.stripe_customer_id,
  asub.trial_end,
  -- Computed status based on subscription state
  CASE 
    WHEN a.is_active = false THEN 'suspended'
    WHEN asub.status = 'trial' AND asub.trial_end < NOW() THEN 'trial_expired'
    WHEN asub.status = 'trial' AND asub.trial_end >= NOW() THEN 'trialing'
    WHEN asub.status = 'past_due' THEN 'past_due'
    WHEN asub.status = 'canceled' THEN 'canceled'
    WHEN asub.status = 'active' THEN 'active'
    ELSE 'unknown'
  END as computed_status
FROM public.agencies a
-- Pre-aggregated subquery for user count
LEFT JOIN (
  SELECT agency_id, COUNT(DISTINCT user_id) as user_count
  FROM public.agency_users
  GROUP BY agency_id
) user_counts ON a.id = user_counts.agency_id
-- Pre-aggregated subquery for client count
LEFT JOIN (
  SELECT agency_id, COUNT(*) as client_count
  FROM public.clients
  GROUP BY agency_id
) client_counts ON a.id = client_counts.agency_id
-- Pre-aggregated subquery for task count
LEFT JOIN (
  SELECT agency_id, COUNT(*) as task_count
  FROM public.tasks
  GROUP BY agency_id
) task_counts ON a.id = task_counts.agency_id
-- Pre-aggregated subquery for payment totals
LEFT JOIN (
  SELECT agency_id, SUM(amount) as total_revenue
  FROM public.client_payments
  WHERE status = 'paid'
  GROUP BY agency_id
) payment_totals ON a.id = payment_totals.agency_id
-- Simple 1:1 JOINs for subscription
LEFT JOIN public.agency_subscriptions asub ON a.id = asub.agency_id
LEFT JOIN public.subscription_plans sp ON asub.plan_id = sp.id
-- Security filter - executed only once
WHERE public.is_master_agency_admin();