-- Keep numeric automation conditions from failing when lead fields contain free text.

CREATE OR REPLACE FUNCTION public.automation_compare_condition(
  actual_text text,
  actual_array text[],
  operator_text text,
  expected_text text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  op text := lower(COALESCE(operator_text, 'equals'));
  actual_norm text := lower(COALESCE(actual_text, ''));
  expected_norm text := lower(COALESCE(expected_text, ''));
  actual_is_numeric boolean := COALESCE(actual_text, '') ~ '^\s*-?\d+(\.\d+)?\s*$';
  expected_is_numeric boolean := COALESCE(expected_text, '') ~ '^\s*-?\d+(\.\d+)?\s*$';
BEGIN
  IF op = 'exists' THEN
    RETURN COALESCE(array_length(actual_array, 1), 0) > 0 OR btrim(COALESCE(actual_text, '')) <> '';
  END IF;

  IF op = 'not_exists' THEN
    RETURN COALESCE(array_length(actual_array, 1), 0) = 0 AND btrim(COALESCE(actual_text, '')) = '';
  END IF;

  IF actual_array IS NOT NULL THEN
    IF op IN ('contains', 'includes') THEN
      RETURN EXISTS (SELECT 1 FROM unnest(actual_array) v WHERE lower(v) = expected_norm);
    END IF;

    IF op = 'not_contains' THEN
      RETURN NOT EXISTS (SELECT 1 FROM unnest(actual_array) v WHERE lower(v) = expected_norm);
    END IF;
  END IF;

  IF op = 'contains' THEN
    RETURN position(expected_norm in actual_norm) > 0;
  END IF;

  IF op = 'not_contains' THEN
    RETURN position(expected_norm in actual_norm) = 0;
  END IF;

  IF op = 'not_equals' THEN
    RETURN actual_norm <> expected_norm;
  END IF;

  IF op = 'greater_than' THEN
    RETURN actual_is_numeric AND expected_is_numeric AND actual_text::numeric > expected_text::numeric;
  END IF;

  IF op = 'less_than' THEN
    RETURN actual_is_numeric AND expected_is_numeric AND actual_text::numeric < expected_text::numeric;
  END IF;

  IF op = 'is_true' THEN
    RETURN actual_norm IN ('true', 'sim', 'yes', '1');
  END IF;

  IF op = 'is_false' THEN
    RETURN actual_norm IN ('false', 'nao', 'no', '0', '');
  END IF;

  RETURN actual_norm = expected_norm;
END;
$$;
