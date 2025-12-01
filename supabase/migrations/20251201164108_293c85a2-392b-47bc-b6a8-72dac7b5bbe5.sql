CREATE TABLE IF NOT EXISTS public.traffic_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  ad_account_name TEXT,
  client_name TEXT,
  budget NUMERIC,
  last_optimization_date DATE,
  results TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.traffic_controls ENABLE ROW LEVEL SECURITY;