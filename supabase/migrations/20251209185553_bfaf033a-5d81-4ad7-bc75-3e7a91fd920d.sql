-- Create table for general client files
CREATE TABLE public.client_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  file_url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view client files from their agency"
ON public.client_files FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Users can create client files in their agency"
ON public.client_files FOR INSERT
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Users can update client files in their agency"
ON public.client_files FOR UPDATE
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Admins can delete client files"
ON public.client_files FOR DELETE
USING (is_agency_admin(agency_id));

-- Create indexes
CREATE INDEX idx_client_files_client_id ON public.client_files(client_id);
CREATE INDEX idx_client_files_agency_id ON public.client_files(agency_id);

-- Create storage bucket for client files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-files', 'client-files', true, 10485760);

-- Storage policies for client files bucket
CREATE POLICY "Users can view client files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can upload client files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their uploads"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete client files"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-files' AND auth.role() = 'authenticated');