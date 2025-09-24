-- Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL,
  price_yearly DECIMAL(10,2),
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_clients INTEGER NOT NULL DEFAULT 50,
  max_leads INTEGER NOT NULL DEFAULT 500,
  max_tasks INTEGER NOT NULL DEFAULT 100,
  max_storage_gb INTEGER NOT NULL DEFAULT 1,
  has_crm BOOLEAN NOT NULL DEFAULT false,
  has_advanced_reports BOOLEAN NOT NULL DEFAULT false,
  has_api_access BOOLEAN NOT NULL DEFAULT false,
  has_white_label BOOLEAN NOT NULL DEFAULT false,
  has_priority_support BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agency_subscriptions table
CREATE TABLE public.agency_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, canceled, unpaid
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  last_payment_date TIMESTAMP WITH TIME ZONE,
  next_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

-- Create billing_history table for invoice tracking
CREATE TABLE public.billing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.agency_subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL, -- paid, failed, pending, canceled
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_metrics table for tracking agency usage
CREATE TABLE public.usage_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  users_count INTEGER NOT NULL DEFAULT 0,
  clients_count INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  tasks_count INTEGER NOT NULL DEFAULT 0,
  storage_used_gb DECIMAL(10,2) NOT NULL DEFAULT 0,
  api_calls_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, period_start)
);

-- Enable RLS on new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_agency_subscriptions_agency_id ON public.agency_subscriptions(agency_id);
CREATE INDEX idx_agency_subscriptions_status ON public.agency_subscriptions(status);
CREATE INDEX idx_agency_subscriptions_stripe_customer ON public.agency_subscriptions(stripe_customer_id);
CREATE INDEX idx_billing_history_agency_id ON public.billing_history(agency_id);
CREATE INDEX idx_billing_history_status ON public.billing_history(status);
CREATE INDEX idx_usage_metrics_agency_id ON public.usage_metrics(agency_id);
CREATE INDEX idx_usage_metrics_period ON public.usage_metrics(period_start, period_end);

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_monthly, price_yearly, max_users, max_clients, max_leads, max_tasks, max_storage_gb, has_crm, has_advanced_reports, has_api_access, has_white_label, has_priority_support, sort_order) VALUES
('Grátis', 'free', 'Plano gratuito para começar', 0.00, 0.00, 2, 10, 50, 25, 1, false, false, false, false, false, 1),
('Básico', 'basic', 'Ideal para pequenas agências', 297.00, 2970.00, 5, 50, 500, 100, 5, true, false, false, false, false, 2),
('Profissional', 'pro', 'Para agências em crescimento', 597.00, 5970.00, 15, 200, 2000, 500, 20, true, true, true, false, true, 3),
('Enterprise', 'enterprise', 'Solução completa para grandes agências', 1197.00, 11970.00, 999, 999, 9999, 9999, 100, true, true, true, true, true, 4);

-- Create function to get agency subscription with plan details
CREATE OR REPLACE FUNCTION public.get_agency_subscription(agency_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  subscription_id UUID,
  agency_id UUID,
  plan_name TEXT,
  plan_slug TEXT,
  status TEXT,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  max_users INTEGER,
  max_clients INTEGER,
  max_leads INTEGER,
  max_tasks INTEGER,
  max_storage_gb INTEGER,
  has_crm BOOLEAN,
  has_advanced_reports BOOLEAN,
  has_api_access BOOLEAN,
  has_white_label BOOLEAN,
  has_priority_support BOOLEAN
) AS $$
DECLARE
  target_agency_id UUID;
BEGIN
  -- If no agency specified, use user's current agency
  target_agency_id := COALESCE(agency_uuid, public.get_user_agency_id());
  
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.agency_id,
    p.name as plan_name,
    p.slug as plan_slug,
    s.status,
    s.trial_end,
    s.current_period_end,
    p.max_users,
    p.max_clients,
    p.max_leads,
    p.max_tasks,
    p.max_storage_gb,
    p.has_crm,
    p.has_advanced_reports,
    p.has_api_access,
    p.has_white_label,
    p.has_priority_support
  FROM public.agency_subscriptions s
  JOIN public.subscription_plans p ON s.plan_id = p.id
  WHERE s.agency_id = target_agency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if agency has reached limits
CREATE OR REPLACE FUNCTION public.check_agency_limits(
  agency_uuid UUID,
  limit_type TEXT, -- 'users', 'clients', 'leads', 'tasks', 'storage'
  current_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  subscription_info RECORD;
  max_allowed INTEGER;
BEGIN
  -- Get subscription info
  SELECT * INTO subscription_info 
  FROM public.get_agency_subscription(agency_uuid) 
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false; -- No subscription found, deny access
  END IF;
  
  -- Check if subscription is active
  IF subscription_info.status NOT IN ('active', 'trial') THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if agency subscription is active
CREATE OR REPLACE FUNCTION public.is_agency_subscription_active(agency_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_agency_id UUID;
  subscription_status TEXT;
  trial_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  target_agency_id := COALESCE(agency_uuid, public.get_user_agency_id());
  
  SELECT s.status, s.trial_end 
  INTO subscription_status, trial_end_date
  FROM public.agency_subscriptions s
  WHERE s.agency_id = target_agency_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if subscription is active or in valid trial period
  IF subscription_status = 'active' THEN
    RETURN true;
  ELSIF subscription_status = 'trial' AND trial_end_date > now() THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create RLS policies for subscription_plans (public read)
CREATE POLICY "Anyone can view subscription plans" ON public.subscription_plans
FOR SELECT USING (is_active = true);

-- Create RLS policies for agency_subscriptions
CREATE POLICY "Agency members can view their subscription" ON public.agency_subscriptions
FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage their subscription" ON public.agency_subscriptions
FOR ALL USING (public.is_agency_admin(agency_id));

-- Create RLS policies for billing_history
CREATE POLICY "Agency admins can view their billing history" ON public.billing_history
FOR SELECT USING (public.is_agency_admin(agency_id));

-- Create RLS policies for usage_metrics
CREATE POLICY "Agency admins can view their usage metrics" ON public.usage_metrics
FOR SELECT USING (public.is_agency_admin(agency_id));

-- Add triggers for updated_at columns
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_subscriptions_updated_at
BEFORE UPDATE ON public.agency_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_billing_history_updated_at
BEFORE UPDATE ON public.billing_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to initialize agency subscription (called when creating agency)
CREATE OR REPLACE FUNCTION public.initialize_agency_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id 
  FROM public.subscription_plans 
  WHERE slug = 'free' AND is_active = true 
  LIMIT 1;
  
  -- Create subscription with 14-day trial
  INSERT INTO public.agency_subscriptions (
    agency_id,
    plan_id,
    status,
    trial_start,
    trial_end,
    billing_cycle
  ) VALUES (
    NEW.id,
    free_plan_id,
    'trial',
    now(),
    now() + INTERVAL '14 days',
    'monthly'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create subscription when agency is created
CREATE TRIGGER initialize_agency_subscription_trigger
AFTER INSERT ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.initialize_agency_subscription();