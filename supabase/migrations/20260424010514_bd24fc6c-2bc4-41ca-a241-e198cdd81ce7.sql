ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS onboarding_discount_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_widget_dismissed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.complete_fast_track(agency_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_eligible BOOLEAN;
BEGIN
  IF NOT public.is_agency_admin(agency_uuid) THEN
    RAISE EXCEPTION 'Not authorized for this agency';
  END IF;

  UPDATE public.agencies
  SET
    onboarding_completed_at = NOW(),
    onboarding_discount_eligible = (EXTRACT(EPOCH FROM (NOW() - created_at))/3600 <= 24)
  WHERE id = agency_uuid
    AND onboarding_completed_at IS NULL
  RETURNING onboarding_discount_eligible INTO is_eligible;

  RETURN COALESCE(is_eligible, false);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_fast_track(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_fast_track(UUID) TO authenticated;