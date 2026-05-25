-- Add per-flow send windows to WhatsApp automation starts handled by database triggers.

CREATE OR REPLACE FUNCTION public.automation_schedule_weekday_key(p_date date)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE EXTRACT(ISODOW FROM p_date)::integer
    WHEN 1 THEN 'monday'
    WHEN 2 THEN 'tuesday'
    WHEN 3 THEN 'wednesday'
    WHEN 4 THEN 'thursday'
    WHEN 5 THEN 'friday'
    WHEN 6 THEN 'saturday'
    ELSE 'sunday'
  END;
$$;

CREATE OR REPLACE FUNCTION public.automation_next_schedule_run_at(
  p_window jsonb DEFAULT '{}'::jsonb,
  p_from timestamptz DEFAULT now()
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  enabled boolean;
  timezone_name text;
  allowed_days text[];
  start_time time;
  end_time time;
  local_now timestamp;
  candidate_date date;
  candidate_start timestamp;
  day_offset integer;
BEGIN
  enabled := lower(COALESCE(p_window ->> 'enabled', 'false')) IN ('true', '1', 'yes', 'sim');
  IF NOT enabled THEN
    RETURN p_from;
  END IF;

  timezone_name := COALESCE(NULLIF(p_window ->> 'timezone', ''), 'America/Sao_Paulo');
  start_time := COALESCE(NULLIF(p_window ->> 'start_time', '')::time, '08:00'::time);
  end_time := COALESCE(NULLIF(p_window ->> 'end_time', '')::time, '17:00'::time);

  IF end_time <= start_time THEN
    RETURN p_from;
  END IF;

  IF jsonb_typeof(p_window -> 'days') = 'array' THEN
    SELECT array_agg(lower(value))
    INTO allowed_days
    FROM jsonb_array_elements_text(p_window -> 'days') AS value;
  END IF;

  IF allowed_days IS NULL OR array_length(allowed_days, 1) = 0 THEN
    allowed_days := ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  END IF;

  local_now := p_from AT TIME ZONE timezone_name;

  FOR day_offset IN 0..14 LOOP
    candidate_date := local_now::date + day_offset;
    IF NOT public.automation_schedule_weekday_key(candidate_date) = ANY(allowed_days) THEN
      CONTINUE;
    END IF;

    IF day_offset = 0 AND local_now::time >= start_time AND local_now::time < end_time THEN
      RETURN p_from;
    END IF;

    IF day_offset = 0 AND local_now::time >= end_time THEN
      CONTINUE;
    END IF;

    candidate_start := candidate_date + start_time;
    RETURN candidate_start AT TIME ZONE timezone_name;
  END LOOP;

  RETURN p_from;
EXCEPTION WHEN OTHERS THEN
  RETURN p_from;
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
  current_ts timestamptz;
  first_run_at timestamptz;
  outside_window boolean;
  pending_payload jsonb;
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

    current_ts := now();
    first_run_at := public.automation_next_schedule_run_at(flow_row.trigger_config -> 'schedule_window', current_ts);
    outside_window := first_step.id IS NOT NULL AND first_run_at > current_ts + interval '1 second';
    pending_payload := COALESCE(p_payload, '{}'::jsonb);

    IF outside_window THEN
      pending_payload := pending_payload || jsonb_build_object(
        '__schedule_window_waiting', true,
        '__schedule_window_next_run_at', first_run_at
      );
    END IF;

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
        CASE
          WHEN first_step.id IS NULL THEN 'completed'
          WHEN outside_window THEN 'waiting'
          ELSE 'running'
        END,
        first_step.id,
        p_trigger_type,
        COALESCE(p_payload, '{}'::jsonb),
        CASE WHEN first_step.id IS NULL THEN current_ts ELSE NULL END
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

    IF outside_window THEN
      INSERT INTO public.automation_execution_logs (
        execution_id,
        flow_id,
        agency_id,
        lead_id,
        step_id,
        event_type,
        message,
        metadata
      )
      VALUES (
        execution_id,
        flow_row.id,
        p_agency_id,
        p_lead_id,
        first_step.id,
        'schedule_window_delayed',
        'Fluxo disparado fora da janela permitida.',
        jsonb_build_object(
          'next_run_at', first_run_at,
          'timezone', COALESCE(flow_row.trigger_config #>> '{schedule_window,timezone}', 'America/Sao_Paulo'),
          'schedule_window', COALESCE(flow_row.trigger_config -> 'schedule_window', '{}'::jsonb)
        )
      );
    END IF;

    PERFORM public.increment_automation_flow_metric(
      flow_row.id,
      'entered',
      1,
      jsonb_build_object('last_execution_at', current_ts)
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
        pending_payload,
        first_run_at,
        execution_id::text || ':' || first_step.id::text
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    ELSE
      PERFORM public.increment_automation_flow_metric(flow_row.id, 'completed', 1);
    END IF;
  END LOOP;
END;
$$;
