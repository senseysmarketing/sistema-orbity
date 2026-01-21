-- Fix previous attempt: use a temp table so we can reuse the agency set across statements.

CREATE TEMP TABLE _target_agencies AS
SELECT DISTINCT agency_id
FROM public.lead_statuses
WHERE agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.lead_statuses ls2
    WHERE ls2.agency_id = public.lead_statuses.agency_id
      AND lower(ls2.name) = 'em contato'
  );

-- Shift existing order positions to open a slot at position 2
UPDATE public.lead_statuses ls
SET order_position = ls.order_position + 1,
    updated_at = now()
WHERE ls.agency_id IN (SELECT agency_id FROM _target_agencies)
  AND ls.order_position >= 2;

-- Insert the new status
INSERT INTO public.lead_statuses (
  agency_id,
  name,
  color,
  order_position,
  is_default,
  is_system,
  is_active
)
SELECT
  ta.agency_id,
  'Em contato' AS name,
  'bg-sky-500' AS color,
  2 AS order_position,
  true AS is_default,
  true AS is_system,
  true AS is_active
FROM _target_agencies ta;

DROP TABLE _target_agencies;
