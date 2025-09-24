-- Create onboarding table to track agency setup process
CREATE TABLE public.agency_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  step_current integer NOT NULL DEFAULT 1,
  step_total integer NOT NULL DEFAULT 4,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  setup_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);

-- Enable RLS on onboarding table
ALTER TABLE public.agency_onboarding ENABLE ROW LEVEL SECURITY;

-- Create policy for onboarding access
CREATE POLICY "Users can manage their own onboarding" 
ON public.agency_onboarding 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to initialize agency trial
CREATE OR REPLACE FUNCTION public.start_agency_trial(
  p_agency_id uuid,
  p_plan_slug text DEFAULT 'basic'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Get the plan ID
  SELECT id INTO v_plan_id 
  FROM public.subscription_plans 
  WHERE slug = p_plan_slug AND is_active = true 
  LIMIT 1;
  
  IF v_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_slug;
  END IF;
  
  -- Create trial subscription
  INSERT INTO public.agency_subscriptions (
    agency_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    billing_cycle
  ) VALUES (
    p_agency_id,
    v_plan_id,
    'trial',
    now(),
    now() + INTERVAL '7 days',
    'monthly'
  );
END;
$function$;