-- Second migration: Create functions and update user role
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$function$;

-- Set the specific user as super_admin
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE user_id = 'de9caa99-0f86-4823-b887-41b1750046b8';

-- Create function to check if agency subscription is active and valid
CREATE OR REPLACE FUNCTION public.is_agency_subscription_valid(agency_uuid uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_agency_id UUID;
  subscription_status TEXT;
  subscription_end TIMESTAMP WITH TIME ZONE;
  trial_end TIMESTAMP WITH TIME ZONE;
BEGIN
  target_agency_id := COALESCE(agency_uuid, public.get_user_agency_id());
  
  SELECT s.status, s.current_period_end, s.trial_end 
  INTO subscription_status, subscription_end, trial_end
  FROM public.agency_subscriptions s
  WHERE s.agency_id = target_agency_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if subscription is active or in valid trial period
  IF subscription_status = 'active' AND (subscription_end IS NULL OR subscription_end > now()) THEN
    RETURN true;
  ELSIF subscription_status = 'trial' AND trial_end > now() THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$function$;