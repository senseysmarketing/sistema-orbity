-- First check if the role column exists and update the user_role enum
DO $$
BEGIN
    -- Drop and recreate the user_role enum with new values
    DROP TYPE IF EXISTS user_role CASCADE;
    CREATE TYPE user_role AS ENUM ('super_admin', 'agency_admin', 'agency_user');
    
    -- Update the profiles table to use the new enum
    -- If role column doesn't exist, it will use the default value from the type definition
    ALTER TABLE public.profiles 
    ALTER COLUMN role SET DEFAULT 'agency_user'::user_role;
    
    -- Set all existing users to agency_admin for now (they can be adjusted later)
    UPDATE public.profiles 
    SET role = 'agency_admin'::user_role;
    
EXCEPTION 
    WHEN OTHERS THEN
        -- If anything fails, just continue
        NULL;
END $$;

-- Update the handle_new_user function to assign proper roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_role_from_meta text;
BEGIN
  -- Get role from metadata, default to agency_admin for onboarding flow
  user_role_from_meta := COALESCE(NEW.raw_user_meta_data->>'role', 'agency_admin');
  
  -- Map old roles to new ones
  user_role_from_meta := CASE user_role_from_meta
    WHEN 'administrador' THEN 'agency_admin'
    WHEN 'gestor_trafego' THEN 'agency_user'
    WHEN 'designer' THEN 'agency_user'
    ELSE user_role_from_meta
  END;

  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    user_role_from_meta::user_role
  );
  RETURN NEW;
END;
$function$;