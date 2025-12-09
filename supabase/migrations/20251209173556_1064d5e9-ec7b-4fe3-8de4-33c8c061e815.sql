-- Create client_credentials table for secure access storage
CREATE TABLE public.client_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  username TEXT,
  password TEXT,
  url TEXT,
  notes TEXT,
  category TEXT DEFAULT 'other',
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create client_notes table for timeline/activity notes
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'note',
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_credentials - all agency members can view and manage
CREATE POLICY "Agency members can view client credentials"
ON public.client_credentials FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create client credentials"
ON public.client_credentials FOR INSERT
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update client credentials"
ON public.client_credentials FOR UPDATE
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete client credentials"
ON public.client_credentials FOR DELETE
USING (is_agency_admin(agency_id));

-- RLS Policies for client_notes - all agency members can view and manage
CREATE POLICY "Agency members can view client notes"
ON public.client_notes FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create client notes"
ON public.client_notes FOR INSERT
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update own notes"
ON public.client_notes FOR UPDATE
USING (user_belongs_to_agency(agency_id) AND created_by = auth.uid());

CREATE POLICY "Agency admins can delete client notes"
ON public.client_notes FOR DELETE
USING (is_agency_admin(agency_id) OR created_by = auth.uid());

-- Create indexes
CREATE INDEX idx_client_credentials_client_id ON public.client_credentials(client_id);
CREATE INDEX idx_client_credentials_agency_id ON public.client_credentials(agency_id);
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_notes_agency_id ON public.client_notes(agency_id);
CREATE INDEX idx_client_notes_created_at ON public.client_notes(created_at DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_client_credentials_updated_at
BEFORE UPDATE ON public.client_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();