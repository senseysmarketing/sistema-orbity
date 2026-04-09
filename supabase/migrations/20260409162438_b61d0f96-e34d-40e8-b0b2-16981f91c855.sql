-- Tabela orbity_leads
CREATE TABLE public.orbity_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  instagram TEXT,
  team_size TEXT,
  active_clients TEXT,
  avg_ticket TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orbity_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can manage orbity_leads"
  ON public.orbity_leads FOR ALL
  TO authenticated
  USING (public.is_master_agency_admin())
  WITH CHECK (public.is_master_agency_admin());

CREATE POLICY "Anyone can insert orbity_leads"
  ON public.orbity_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE TRIGGER update_orbity_leads_updated_at
  BEFORE UPDATE ON public.orbity_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna monthly_value na tabela agencies
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS monthly_value NUMERIC DEFAULT 0;