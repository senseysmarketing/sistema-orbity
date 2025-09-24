-- Create function to enforce plan limits
CREATE OR REPLACE FUNCTION public.enforce_plan_limits(
  agency_uuid uuid,
  limit_type text,
  current_count integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  subscription_info RECORD;
  max_allowed INTEGER;
BEGIN
  -- Super admins bypass all limits
  IF is_super_admin() THEN
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

-- Update RLS policies to include super admin access
CREATE POLICY "Super admins can view all agencies" 
ON public.agencies 
FOR ALL 
USING (is_super_admin());

CREATE POLICY "Super admins can view all subscriptions" 
ON public.agency_subscriptions 
FOR ALL 
USING (is_super_admin());

CREATE POLICY "Super admins can view all profiles" 
ON public.profiles 
FOR ALL 
USING (is_super_admin());