ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS report_token TEXT,
  ADD COLUMN IF NOT EXISTS report_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_report_token
  ON public.clients(report_token) WHERE report_token IS NOT NULL;