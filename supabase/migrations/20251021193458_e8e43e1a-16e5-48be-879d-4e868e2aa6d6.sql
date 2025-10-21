-- Fix Critical Security Issues

-- 1. Fix profiles table - restrict to agency members only
DROP POLICY IF EXISTS "Authenticated users can view all profiles for task assignment" ON profiles;

-- Create agency-scoped policy for profile viewing
CREATE POLICY "Users can view profiles in their agencies" 
ON profiles 
FOR SELECT 
USING (
  user_id = auth.uid() -- Users can always see their own profile
  OR
  user_id IN (
    SELECT au1.user_id 
    FROM agency_users au1
    WHERE au1.agency_id IN (
      SELECT au2.agency_id 
      FROM agency_users au2 
      WHERE au2.user_id = auth.uid()
    )
  )
);

-- 2. Recreate master_agency_overview view with security_barrier for RLS-like protection
DROP VIEW IF EXISTS master_agency_overview CASCADE;

CREATE VIEW master_agency_overview
WITH (security_barrier = true, security_invoker = false)
AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  a.created_at,
  a.is_active,
  COUNT(DISTINCT au.user_id) as user_count,
  COUNT(DISTINCT c.id) as client_count,
  COUNT(DISTINCT t.id) as task_count,
  COALESCE(SUM(CASE WHEN cp.status = 'paid' THEN cp.amount ELSE 0 END), 0) as total_revenue,
  sp.name as subscription_plan,
  asub.status as subscription_status,
  asub.current_period_end,
  asub.stripe_customer_id
FROM agencies a
LEFT JOIN agency_users au ON a.id = au.agency_id
LEFT JOIN clients c ON a.id = c.agency_id
LEFT JOIN tasks t ON a.id = t.agency_id
LEFT JOIN client_payments cp ON a.id = cp.agency_id
LEFT JOIN agency_subscriptions asub ON a.id = asub.agency_id
LEFT JOIN subscription_plans sp ON asub.plan_id = sp.id
WHERE is_master_user() OR is_super_admin()
GROUP BY a.id, a.name, a.created_at, a.is_active, sp.name, asub.status, asub.current_period_end, asub.stripe_customer_id;

COMMENT ON VIEW master_agency_overview IS 'Master admin view - restricted to master/super admin users';

-- 3. Create limited public view for subscription plans (no Stripe IDs or exact limits)
CREATE OR REPLACE VIEW public_pricing_plans AS
SELECT 
  id,
  name,
  description,
  price_monthly,
  price_yearly,
  is_active
FROM subscription_plans
WHERE is_active = true;

COMMENT ON VIEW public_pricing_plans IS 'Public pricing view - no Stripe IDs or feature limits exposed';

-- 4. Enable RLS on subscription_plans and add policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON subscription_plans;

-- Allow viewing basic info for active plans
CREATE POLICY "Public can view active plans" 
ON subscription_plans 
FOR SELECT 
USING (is_active = true);

-- 5. Add parameter validation to security definer functions
CREATE OR REPLACE FUNCTION public.is_agency_admin(agency_uuid uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_agency_id UUID;
BEGIN
  target_agency_id := COALESCE(agency_uuid, public.get_user_agency_id());
  
  IF target_agency_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = target_agency_id
    AND role IN ('owner', 'admin')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_agency(agency_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF agency_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = agency_uuid
  );
END;
$function$;