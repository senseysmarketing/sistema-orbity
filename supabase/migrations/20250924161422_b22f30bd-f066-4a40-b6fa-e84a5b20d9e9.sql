-- Drop and recreate view without security definer
DROP VIEW IF EXISTS public.master_agency_overview;

-- Create master analytics view (without security definer)
CREATE OR REPLACE VIEW public.master_agency_overview AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.created_at,
  a.is_active,
  COUNT(DISTINCT au.user_id) as user_count,
  COUNT(DISTINCT c.id) as client_count,
  COUNT(DISTINCT t.id) as task_count,
  COALESCE(SUM(cp.amount), 0) as total_revenue,
  sp.name as subscription_plan,
  asub.status as subscription_status,
  asub.current_period_end,
  asub.stripe_customer_id
FROM agencies a
LEFT JOIN agency_users au ON a.id = au.agency_id
LEFT JOIN clients c ON a.id = c.agency_id AND c.active = true
LEFT JOIN tasks t ON a.id = t.agency_id AND t.archived = false
LEFT JOIN client_payments cp ON a.id = cp.agency_id AND cp.status = 'paid'
LEFT JOIN agency_subscriptions asub ON a.id = asub.agency_id
LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
GROUP BY a.id, a.name, a.created_at, a.is_active, sp.name, asub.status, asub.current_period_end, asub.stripe_customer_id
ORDER BY a.created_at DESC;

-- Create RLS policy for master users to access all data
CREATE POLICY "Master users can view all agency data" 
ON public.agencies 
FOR SELECT 
USING (is_master_user());

CREATE POLICY "Master users can update all agencies" 
ON public.agencies 
FOR UPDATE 
USING (is_master_user());