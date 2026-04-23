CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_templates_agency ON public.contract_templates(agency_id);

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members read templates"
  ON public.contract_templates FOR SELECT
  USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "agency members write templates"
  ON public.contract_templates FOR ALL
  USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE TRIGGER trg_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();