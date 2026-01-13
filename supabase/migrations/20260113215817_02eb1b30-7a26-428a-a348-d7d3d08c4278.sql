-- Criar função de verificação baseada na agência master (Senseys)
CREATE OR REPLACE FUNCTION public.is_master_agency_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  master_agency_id UUID := '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = master_agency_id
    AND role IN ('owner', 'admin')
  );
END;
$function$;

-- Atualizar a view master_agency_overview para usar a nova função
DROP VIEW IF EXISTS public.master_agency_overview;

CREATE VIEW public.master_agency_overview
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
FROM public.agencies a
LEFT JOIN public.agency_users au ON a.id = au.agency_id
LEFT JOIN public.clients c ON a.id = c.agency_id
LEFT JOIN public.tasks t ON a.id = t.agency_id
LEFT JOIN public.client_payments cp ON a.id = cp.agency_id
LEFT JOIN public.agency_subscriptions asub ON a.id = asub.agency_id
LEFT JOIN public.subscription_plans sp ON asub.plan_id = sp.id
WHERE public.is_master_agency_admin()
GROUP BY a.id, a.name, a.created_at, a.is_active, sp.name, asub.status, asub.current_period_end, asub.stripe_customer_id;

-- Atualizar função enforce_plan_limits para usar is_master_agency_admin
CREATE OR REPLACE FUNCTION public.enforce_plan_limits(agency_uuid uuid, limit_type text, current_count integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  subscription_info RECORD;
  max_allowed INTEGER;
BEGIN
  -- Master agency admins bypass all limits
  IF is_master_agency_admin() THEN
    RETURN true;
  END IF;

  -- Check if subscription is valid first
  IF NOT is_agency_subscription_valid(agency_uuid) THEN
    RETURN false;
  END IF;

  -- Get subscription info
  SELECT * INTO subscription_info 
  FROM public.get_agency_subscription(agency_uuid) 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get the appropriate limit
  CASE limit_type
    WHEN 'users' THEN max_allowed := subscription_info.max_users;
    WHEN 'clients' THEN max_allowed := subscription_info.max_clients;
    WHEN 'leads' THEN max_allowed := subscription_info.max_leads;
    WHEN 'tasks' THEN max_allowed := subscription_info.max_tasks;
    WHEN 'storage' THEN max_allowed := subscription_info.max_storage_gb;
    ELSE RETURN false;
  END CASE;
  
  -- Check if within limits
  RETURN current_count <= max_allowed;
END;
$function$;