-- Create credential history table
CREATE TABLE public.client_credential_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_id UUID NOT NULL REFERENCES public.client_credentials(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'password_viewed', 'password_copied'
  changed_fields JSONB DEFAULT '{}',
  changed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_credential_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Agency members can view credential history"
  ON public.client_credential_history FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can insert credential history"
  ON public.client_credential_history FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

-- Indexes
CREATE INDEX idx_credential_history_credential ON public.client_credential_history(credential_id);
CREATE INDEX idx_credential_history_client ON public.client_credential_history(client_id);
CREATE INDEX idx_credential_history_created ON public.client_credential_history(created_at DESC);