
-- Create the missing RPC function for normalized phone lookup
CREATE OR REPLACE FUNCTION public.find_lead_by_normalized_phone(p_agency_id uuid, p_phone_digits text)
RETURNS TABLE(id uuid, name text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT l.id, l.name, l.phone
  FROM public.leads l
  WHERE l.agency_id = p_agency_id
    AND regexp_replace(l.phone, '\D', '', 'g') = p_phone_digits
  LIMIT 1;
$$;
