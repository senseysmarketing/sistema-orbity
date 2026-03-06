-- Tabela facebook_pixels para armazenar pixels descobertos via OAuth
CREATE TABLE public.facebook_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  ad_account_id text NOT NULL,
  pixel_id text NOT NULL,
  pixel_name text NOT NULL,
  is_selected boolean DEFAULT false,
  is_active boolean DEFAULT true,
  test_event_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, pixel_id)
);

-- Garantir apenas um pixel selecionado por agência
CREATE UNIQUE INDEX idx_one_selected_pixel_per_agency
  ON public.facebook_pixels (agency_id) WHERE is_selected = true;

-- RLS
ALTER TABLE public.facebook_pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view their pixels"
  ON public.facebook_pixels FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can insert pixels"
  ON public.facebook_pixels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Agency admins can update pixels"
  ON public.facebook_pixels FOR UPDATE
  TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Agency admins can delete pixels"
  ON public.facebook_pixels FOR DELETE
  TO authenticated
  USING (public.is_agency_admin(agency_id));

-- Trigger updated_at
CREATE TRIGGER update_facebook_pixels_updated_at
  BEFORE UPDATE ON public.facebook_pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: query única para pixel + token (reduz latência)
CREATE OR REPLACE FUNCTION public.get_meta_pixel_config(p_agency_id uuid)
RETURNS TABLE(pixel_id text, test_event_code text, access_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.pixel_id, p.test_event_code, c.access_token
  FROM public.facebook_pixels p
  JOIN public.facebook_connections c ON p.agency_id = c.agency_id
  WHERE p.agency_id = p_agency_id
    AND p.is_selected = true
    AND p.is_active = true
    AND c.is_active = true
  LIMIT 1;
$$;