-- Tabela de templates de cobrança manual por agência
CREATE TABLE public.agency_billing_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  content text NOT NULL,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_billing_templates_key_check CHECK (template_key IN ('asaas','conexa','pix','generic')),
  CONSTRAINT agency_billing_templates_unique UNIQUE (agency_id, template_key)
);

ALTER TABLE public.agency_billing_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro da agência
CREATE POLICY "Agency members can view billing templates"
ON public.agency_billing_templates
FOR SELECT
TO authenticated
USING (public.user_belongs_to_agency(agency_id));

-- INSERT/UPDATE/DELETE: somente admins/owners da agência (ou master admin)
CREATE POLICY "Agency admins can insert billing templates"
ON public.agency_billing_templates
FOR INSERT
TO authenticated
WITH CHECK (public.is_agency_admin(agency_id) OR public.is_master_agency_admin());

CREATE POLICY "Agency admins can update billing templates"
ON public.agency_billing_templates
FOR UPDATE
TO authenticated
USING (public.is_agency_admin(agency_id) OR public.is_master_agency_admin())
WITH CHECK (public.is_agency_admin(agency_id) OR public.is_master_agency_admin());

CREATE POLICY "Agency admins can delete billing templates"
ON public.agency_billing_templates
FOR DELETE
TO authenticated
USING (public.is_agency_admin(agency_id) OR public.is_master_agency_admin());

-- Trigger updated_at
CREATE TRIGGER set_agency_billing_templates_updated_at
BEFORE UPDATE ON public.agency_billing_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agency_billing_templates_agency ON public.agency_billing_templates(agency_id);