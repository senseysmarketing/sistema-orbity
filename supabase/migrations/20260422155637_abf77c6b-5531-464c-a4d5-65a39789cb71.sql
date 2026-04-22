CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_rows int NOT NULL,
  processed_rows int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  gateway_synced_count int NOT NULL DEFAULT 0,
  gateway_skipped_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  sync_gateway boolean NOT NULL DEFAULT false,
  add_to_mrr boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members select own jobs"
ON public.import_jobs
FOR SELECT
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "agency admins insert jobs"
ON public.import_jobs
FOR INSERT
WITH CHECK (public.is_agency_admin(agency_id));

CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_import_jobs_agency_created ON public.import_jobs(agency_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;
ALTER TABLE public.import_jobs REPLICA IDENTITY FULL;