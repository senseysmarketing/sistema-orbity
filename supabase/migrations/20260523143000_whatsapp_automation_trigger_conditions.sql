-- Ensure database-triggered automation starts respect trigger conditions.

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
    RETURN COALESCE(NULLIF(actual_text, '')::numeric, 0) > COALESCE(NULLIF(expected_text, '')::numeric, 0);
  END IF;

  IF op = 'less_than' THEN
    RETURN COALESCE(NULLIF(actual_text, '')::numeric, 0) < COALESCE(NULLIF(expected_text, '')::numeric, 0);
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

CREATE OR REPLACE FUNCTION public.automation_conditions_match(
  p_agency_id uuid,
  p_lead_id uuid,
  p_conditions jsonb DEFAULT '[]'::jsonb,
  p_mode text DEFAULT 'all',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_row public.leads%ROWTYPE;
  condition_row jsonb;
  field_key text;
  actual_text text;
  actual_array text[];
  passed boolean;
  any_passed boolean := false;
  all_passed boolean := true;
BEGIN
  IF p_conditions IS NULL OR jsonb_typeof(p_conditions) <> 'array' OR jsonb_array_length(p_conditions) = 0 THEN
    RETURN true;
  END IF;

  SELECT *
  INTO lead_row
  FROM public.leads
  WHERE id = p_lead_id
    AND agency_id = p_agency_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  FOR condition_row IN SELECT value FROM jsonb_array_elements(p_conditions)
  LOOP
    field_key := lower(COALESCE(condition_row ->> 'field', condition_row ->> 'type', ''));
    actual_text := NULL;
    actual_array := NULL;

    IF field_key IN ('source', 'origem') THEN
      actual_text := lead_row.source;
    ELSIF field_key IN ('status', 'etapa', 'stage', 'pipeline_stage') THEN
      actual_text := lead_row.status;
    ELSIF field_key IN ('assigned_to', 'responsavel', 'owner') THEN
      actual_text := lead_row.assigned_to::text;
    ELSIF field_key IN ('tag', 'tags') THEN
      actual_array := COALESCE(lead_row.tags, ARRAY[]::text[]);
    ELSIF field_key IN ('service_interest', 'servico_interesse') THEN
      actual_text := COALESCE(
        lead_row.custom_fields ->> 'servico_interesse',
        lead_row.custom_fields ->> 'service_interest',
        lead_row.custom_fields ->> 'service',
        lead_row.custom_fields ->> 'servico'
      );
    ELSIF field_key IN ('budget', 'orcamento', 'valor') THEN
      actual_text := COALESCE(
        lead_row.custom_fields ->> 'orcamento',
        lead_row.custom_fields ->> 'budget',
        lead_row.value::text
      );
    ELSIF field_key IN ('company', 'empresa') THEN
      actual_text := lead_row.company;
    ELSIF field_key IN ('campaign', 'campanha') THEN
      actual_text := COALESCE(
        lead_row.custom_fields ->> 'campaign',
        lead_row.custom_fields ->> 'campanha',
        p_payload ->> 'campaign'
      );
    ELSIF field_key IN ('custom_field', 'campo_personalizado') THEN
      actual_text := lead_row.custom_fields ->> COALESCE(condition_row ->> 'custom_field', condition_row ->> 'key');
    ELSIF field_key IN ('lead_replied', 'lead_respondeu') THEN
      actual_text := EXISTS (
        SELECT 1
        FROM public.whatsapp_messages wm
        WHERE wm.lead_id = p_lead_id
          AND COALESCE(wm.is_from_me, false) = false
      )::text;
    ELSE
      actual_text := lead_row.custom_fields ->> COALESCE(condition_row ->> 'field', '');
    END IF;

    passed := public.automation_compare_condition(
      actual_text,
      actual_array,
      condition_row ->> 'operator',
      condition_row ->> 'value'
    );

    any_passed := any_passed OR passed;
    all_passed := all_passed AND passed;
  END LOOP;

  IF lower(COALESCE(p_mode, 'all')) = 'any' THEN
    RETURN any_passed;
  END IF;

  RETURN all_passed;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_automation_flows_for_lead(
  p_agency_id uuid,
  p_lead_id uuid,
  p_trigger_type text,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  flow_row public.automation_flows%ROWTYPE;
  first_step public.automation_steps%ROWTYPE;
  execution_id uuid;
  has_conflict boolean;
  keyword text;
  content text;
BEGIN
  FOR flow_row IN
    SELECT *
    FROM public.automation_flows
    WHERE agency_id = p_agency_id
      AND status = 'active'
      AND is_deleted = false
      AND (
        trigger_type = p_trigger_type
        OR (
          p_trigger_type = 'whatsapp_message_received'
          AND trigger_type = 'keyword_received'
        )
      )
  LOOP
    IF flow_row.trigger_type = 'keyword_received' THEN
      keyword := lower(trim(COALESCE(flow_row.trigger_config ->> 'keyword', '')));
      content := lower(COALESCE(p_payload ->> 'content', p_payload ->> 'message', ''));
      IF keyword = '' OR position(keyword in content) = 0 THEN
        CONTINUE;
      END IF;
    END IF;

    IF NOT public.automation_conditions_match(
      p_agency_id,
      p_lead_id,
      COALESCE(flow_row.trigger_config -> 'conditions', '[]'::jsonb),
      COALESCE(flow_row.trigger_config ->> 'condition_mode', 'all'),
      COALESCE(p_payload, '{}'::jsonb)
    ) THEN
      CONTINUE;
    END IF;

    IF COALESCE(NULLIF(flow_row.stop_rules ->> 'avoid_conflicts', '')::boolean, true) THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.automation_executions
        WHERE agency_id = p_agency_id
          AND lead_id = p_lead_id
          AND status IN ('running', 'waiting')
      )
      INTO has_conflict;

      IF has_conflict THEN
        CONTINUE;
      END IF;
    END IF;

    SELECT *
    INTO first_step
    FROM public.automation_steps
    WHERE flow_id = flow_row.id
      AND agency_id = p_agency_id
      AND is_deleted = false
    ORDER BY position
    LIMIT 1;

    BEGIN
      INSERT INTO public.automation_executions (
        flow_id,
        agency_id,
        lead_id,
        status,
        current_step_id,
        trigger_type,
        trigger_payload,
        completed_at
      )
      VALUES (
        flow_row.id,
        p_agency_id,
        p_lead_id,
        CASE WHEN first_step.id IS NULL THEN 'completed' ELSE 'running' END,
        first_step.id,
        p_trigger_type,
        COALESCE(p_payload, '{}'::jsonb),
        CASE WHEN first_step.id IS NULL THEN now() ELSE NULL END
      )
      RETURNING id INTO execution_id;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;

    INSERT INTO public.automation_execution_logs (
      execution_id,
      flow_id,
      agency_id,
      lead_id,
      event_type,
      message,
      metadata
    )
    VALUES (
      execution_id,
      flow_row.id,
      p_agency_id,
      p_lead_id,
      'flow_entered',
      'Lead entrou no fluxo.',
      jsonb_build_object('trigger_type', p_trigger_type, 'payload', COALESCE(p_payload, '{}'::jsonb))
    );

    PERFORM public.increment_automation_flow_metric(
      flow_row.id,
      'entered',
      1,
      jsonb_build_object('last_execution_at', now())
    );

    IF first_step.id IS NOT NULL THEN
      INSERT INTO public.automation_pending_actions (
        execution_id,
        flow_id,
        agency_id,
        lead_id,
        step_id,
        action_type,
        payload,
        run_at,
        idempotency_key
      )
      VALUES (
        execution_id,
        flow_row.id,
        p_agency_id,
        p_lead_id,
        first_step.id,
        first_step.step_type,
        COALESCE(p_payload, '{}'::jsonb),
        now(),
        execution_id::text || ':' || first_step.id::text
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    ELSE
      PERFORM public.increment_automation_flow_metric(flow_row.id, 'completed', 1);
    END IF;
  END LOOP;
END;
$$;
