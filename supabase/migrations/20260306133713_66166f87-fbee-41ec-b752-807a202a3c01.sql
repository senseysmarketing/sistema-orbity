
-- 1. New columns on leads
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS qualification_score integer,
  ADD COLUMN IF NOT EXISTS qualification_source text;

-- 2. lead_scoring_rules
CREATE TABLE public.lead_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  form_id text NOT NULL,
  form_name text,
  question text NOT NULL,
  answer text NOT NULL,
  score integer NOT NULL DEFAULT 0 CHECK (score >= -2 AND score <= 2),
  is_blocker boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage scoring rules"
  ON public.lead_scoring_rules FOR ALL
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- 3. lead_scoring_results
CREATE TABLE public.lead_scoring_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  score_total integer NOT NULL DEFAULT 0,
  qualification text NOT NULL DEFAULT 'cold',
  answers_detail jsonb DEFAULT '[]'::jsonb,
  scored_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_scoring_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage scoring results"
  ON public.lead_scoring_results FOR ALL
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- 4. meta_conversion_events
CREATE TABLE public.meta_conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  pixel_id text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  response_data jsonb,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, event_name)
);

ALTER TABLE public.meta_conversion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view conversion events"
  ON public.meta_conversion_events FOR ALL
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- 5. Add pixel_id column to facebook_lead_integrations if not exists
ALTER TABLE public.facebook_lead_integrations 
  ADD COLUMN IF NOT EXISTS pixel_id text;
