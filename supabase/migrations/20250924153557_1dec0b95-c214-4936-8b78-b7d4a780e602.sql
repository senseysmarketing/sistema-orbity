-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'pro', 'enterprise');

-- Create agencies table
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER NOT NULL DEFAULT 5,
  max_clients INTEGER NOT NULL DEFAULT 10,
  max_leads INTEGER NOT NULL DEFAULT 100,
  max_tasks INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on agencies table
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Create agency_users table for user-agency relationships
CREATE TABLE public.agency_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  invited_by UUID REFERENCES public.profiles(user_id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- Enable RLS on agency_users table
ALTER TABLE public.agency_users ENABLE ROW LEVEL SECURITY;

-- Add agency_id to existing tables
ALTER TABLE public.clients ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.personal_tasks ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.traffic_controls ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.expenses ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.salaries ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.client_payments ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.admin_notes ADD COLUMN agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX idx_tasks_agency_id ON public.tasks(agency_id);
CREATE INDEX idx_personal_tasks_agency_id ON public.personal_tasks(agency_id);
CREATE INDEX idx_traffic_controls_agency_id ON public.traffic_controls(agency_id);
CREATE INDEX idx_expenses_agency_id ON public.expenses(agency_id);
CREATE INDEX idx_salaries_agency_id ON public.salaries(agency_id);
CREATE INDEX idx_client_payments_agency_id ON public.client_payments(agency_id);
CREATE INDEX idx_admin_notes_agency_id ON public.admin_notes(agency_id);
CREATE INDEX idx_agency_users_agency_id ON public.agency_users(agency_id);
CREATE INDEX idx_agency_users_user_id ON public.agency_users(user_id);

-- Create function to get user's current agency
CREATE OR REPLACE FUNCTION public.get_user_agency_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT agency_id 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user belongs to agency
CREATE OR REPLACE FUNCTION public.user_belongs_to_agency(agency_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = agency_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create function to check if user is agency admin
CREATE OR REPLACE FUNCTION public.is_agency_admin(agency_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  target_agency_id UUID;
BEGIN
  -- If no agency specified, use user's current agency
  target_agency_id := COALESCE(agency_uuid, public.get_user_agency_id());
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.agency_users 
    WHERE user_id = auth.uid() 
    AND agency_id = target_agency_id
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create RLS policies for agencies table
CREATE POLICY "Users can view their agencies" ON public.agencies
FOR SELECT USING (
  id IN (
    SELECT agency_id 
    FROM public.agency_users 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Agency admins can update their agency" ON public.agencies
FOR UPDATE USING (public.is_agency_admin(id));

-- Create RLS policies for agency_users table
CREATE POLICY "Users can view agency members" ON public.agency_users
FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage members" ON public.agency_users
FOR ALL USING (public.is_agency_admin(agency_id));

CREATE POLICY "Users can join agencies" ON public.agency_users
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update existing RLS policies to include agency isolation
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can view clients for tasks" ON public.clients;

-- Create new agency-aware policies for clients
CREATE POLICY "Agency members can view agency clients" ON public.clients
FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage agency clients" ON public.clients
FOR ALL USING (public.is_agency_admin(agency_id));

-- Update tasks policies
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON public.tasks;

CREATE POLICY "Agency members can view agency tasks" ON public.tasks
FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create agency tasks" ON public.tasks
FOR INSERT WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update agency tasks" ON public.tasks
FOR UPDATE USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete agency tasks" ON public.tasks
FOR DELETE USING (public.is_agency_admin(agency_id));

-- Update personal_tasks policies to include agency
CREATE POLICY "Agency members can view agency personal tasks" ON public.personal_tasks
FOR SELECT USING (
  (auth.uid() = user_id) AND 
  (agency_id IS NULL OR public.user_belongs_to_agency(agency_id))
);

-- Update other tables policies
DROP POLICY IF EXISTS "Admins can manage traffic controls" ON public.traffic_controls;
CREATE POLICY "Agency admins can manage agency traffic controls" ON public.traffic_controls
FOR ALL USING (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
CREATE POLICY "Agency admins can manage agency expenses" ON public.expenses
FOR ALL USING (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Admins can manage salaries" ON public.salaries;
CREATE POLICY "Agency admins can manage agency salaries" ON public.salaries
FOR ALL USING (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Admins can manage client payments" ON public.client_payments;
CREATE POLICY "Agency admins can manage agency client payments" ON public.client_payments
FOR ALL USING (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Admins can manage admin notes" ON public.admin_notes;
CREATE POLICY "Agency admins can manage agency admin notes" ON public.admin_notes
FOR ALL USING (public.is_agency_admin(agency_id));

-- Create trigger for updating updated_at on agencies
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updating updated_at on agency_users
CREATE TRIGGER update_agency_users_updated_at
BEFORE UPDATE ON public.agency_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();