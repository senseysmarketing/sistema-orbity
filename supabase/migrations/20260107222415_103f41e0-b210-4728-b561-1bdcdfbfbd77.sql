-- Create table for manual CRM investments
CREATE TABLE public.crm_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  reference_month DATE NOT NULL,
  source TEXT NOT NULL,
  source_name TEXT,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(agency_id, reference_month, source, source_name)
);

-- Enable RLS
ALTER TABLE public.crm_investments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their agency investments"
ON public.crm_investments FOR SELECT
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can insert investments for their agency"
ON public.crm_investments FOR INSERT
WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can update their agency investments"
ON public.crm_investments FOR UPDATE
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can delete their agency investments"
ON public.crm_investments FOR DELETE
USING (public.user_belongs_to_agency(agency_id));

-- Trigger for updated_at
CREATE TRIGGER update_crm_investments_updated_at
BEFORE UPDATE ON public.crm_investments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_crm_investments_agency_month ON public.crm_investments(agency_id, reference_month);