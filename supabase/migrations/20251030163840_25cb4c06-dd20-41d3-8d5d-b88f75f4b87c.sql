-- Create import_logs table
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  import_type TEXT NOT NULL,
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Agency admins can manage import logs
CREATE POLICY "Agency admins can manage import logs"
ON public.import_logs
FOR ALL
USING (is_agency_admin(agency_id));

-- Agency members can view import logs
CREATE POLICY "Agency members can view import logs"
ON public.import_logs
FOR SELECT
USING (user_belongs_to_agency(agency_id));

-- Create index for better performance
CREATE INDEX idx_import_logs_agency_id ON public.import_logs(agency_id);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);