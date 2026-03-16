-- Function to find a lead by normalizing the stored phone number to digits only.
-- This handles cases where leads.phone is stored with formatting (spaces, hyphens,
-- plus signs) like "+55 19 98930-3111", while the webhook receives digits-only
-- phone numbers like "5519989303111".
CREATE OR REPLACE FUNCTION find_lead_by_normalized_phone(
  p_agency_id uuid,
  p_phone_digits text
)
RETURNS TABLE(id uuid)
LANGUAGE sql STABLE AS $$
  SELECT id FROM leads
  WHERE agency_id = p_agency_id
    AND regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') = p_phone_digits
  LIMIT 1;
$$;
