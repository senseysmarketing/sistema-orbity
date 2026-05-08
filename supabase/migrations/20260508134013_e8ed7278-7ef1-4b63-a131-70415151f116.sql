-- Create agency_integrations table for external marketing integrations
CREATE TABLE public.agency_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    sendpulse_client_id TEXT,
    sendpulse_client_secret TEXT,
    sendpulse_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT agency_integrations_agency_id_key UNIQUE (agency_id)
);

-- Enable Row Level Security
ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Agency members can view integrations"
ON public.agency_integrations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.agency_users
        WHERE agency_id = agency_integrations.agency_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Agency admins can manage integrations"
ON public.agency_integrations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.agency_users
        WHERE agency_id = agency_integrations.agency_id
        AND user_id = auth.uid()
        AND role = 'agency_admin'
    )
);

-- Add trigger for updated_at
CREATE TRIGGER update_agency_integrations_updated_at
BEFORE UPDATE ON public.agency_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();