-- Create table for Facebook Lead Ads integrations
CREATE TABLE IF NOT EXISTS public.facebook_lead_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.facebook_connections(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  form_id TEXT NOT NULL,
  form_name TEXT NOT NULL,
  sync_method TEXT NOT NULL DEFAULT 'webhook', -- 'webhook' or 'polling'
  default_status TEXT NOT NULL DEFAULT 'new',
  default_priority TEXT NOT NULL DEFAULT 'medium',
  default_source TEXT NOT NULL DEFAULT 'facebook_leads',
  field_mapping JSONB DEFAULT '{}'::jsonb,
  webhook_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Create table for Facebook Lead sync log (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.facebook_lead_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.facebook_lead_integrations(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  facebook_lead_id TEXT NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lead_data JSONB,
  UNIQUE(integration_id, facebook_lead_id)
);

-- Enable RLS
ALTER TABLE public.facebook_lead_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_lead_sync_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_lead_integrations
CREATE POLICY "Agency admins can manage lead integrations"
  ON public.facebook_lead_integrations
  FOR ALL
  USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view lead integrations"
  ON public.facebook_lead_integrations
  FOR SELECT
  USING (user_belongs_to_agency(agency_id));

-- RLS Policies for facebook_lead_sync_log
CREATE POLICY "Agency admins can view sync log"
  ON public.facebook_lead_sync_log
  FOR SELECT
  USING (is_agency_admin(agency_id));

CREATE POLICY "System can insert sync log"
  ON public.facebook_lead_sync_log
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_facebook_lead_integrations_agency ON public.facebook_lead_integrations(agency_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_integrations_connection ON public.facebook_lead_integrations(connection_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_integrations_active ON public.facebook_lead_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_sync_log_integration ON public.facebook_lead_sync_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_facebook_lead_sync_log_facebook_lead ON public.facebook_lead_sync_log(facebook_lead_id);

-- Create trigger for updated_at
CREATE TRIGGER update_facebook_lead_integrations_updated_at
  BEFORE UPDATE ON public.facebook_lead_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();