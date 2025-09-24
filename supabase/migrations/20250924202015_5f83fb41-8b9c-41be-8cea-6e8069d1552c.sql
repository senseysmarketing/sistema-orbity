-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  position TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  value NUMERIC DEFAULT 0,
  notes TEXT,
  assigned_to UUID,
  last_contact DATE,
  next_contact DATE,
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create lead_activities table for tracking interactions
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'proposal_sent', 'status_change')),
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhooks table for custom integrations
CREATE TABLE public.agency_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  headers JSONB DEFAULT '{}',
  secret_token TEXT,
  is_active BOOLEAN DEFAULT true,
  last_triggered TIMESTAMP WITH TIME ZONE,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Agency members can view agency leads" 
ON public.leads 
FOR SELECT 
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create agency leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update agency leads" 
ON public.leads 
FOR UPDATE 
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete agency leads" 
ON public.leads 
FOR DELETE 
USING (is_agency_admin(agency_id));

-- RLS Policies for lead_activities
CREATE POLICY "Agency members can view agency lead activities" 
ON public.lead_activities 
FOR SELECT 
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create agency lead activities" 
ON public.lead_activities 
FOR INSERT 
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update agency lead activities" 
ON public.lead_activities 
FOR UPDATE 
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete agency lead activities" 
ON public.lead_activities 
FOR DELETE 
USING (is_agency_admin(agency_id));

-- RLS Policies for webhooks
CREATE POLICY "Agency admins can manage agency webhooks" 
ON public.agency_webhooks 
FOR ALL 
USING (is_agency_admin(agency_id));

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_webhooks_updated_at
BEFORE UPDATE ON public.agency_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_leads_agency_id ON public.leads(agency_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_agency_id ON public.lead_activities(agency_id);
CREATE INDEX idx_agency_webhooks_agency_id ON public.agency_webhooks(agency_id);