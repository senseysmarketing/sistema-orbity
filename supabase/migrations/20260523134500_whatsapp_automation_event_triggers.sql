-- Database event bridge for WhatsApp automation flows.
-- Keeps core triggers backend-side even when the event source is an existing webhook.

CREATE OR REPLACE FUNCTION public.increment_automation_flow_metric(
  flow_uuid uuid,
  metric_key text,
  amount integer DEFAULT 1,
  extra jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automation_flows
  SET metrics =
    COALESCE(metrics, '{}'::jsonb)
    || jsonb_build_object(
      metric_key,
      COALESCE(NULLIF(metrics ->> metric_key, '')::integer, 0) + amount
    )
    || COALESCE(extra, '{}'::jsonb),
    updated_at = now()
  WHERE id = flow_uuid;
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

CREATE OR REPLACE FUNCTION public.stop_automation_flows_for_lead_reply(
  p_agency_id uuid,
  p_lead_id uuid,
  p_conversation_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stopped_row record;
  stopped_count integer := 0;
BEGIN
  FOR stopped_row IN
    UPDATE public.automation_executions ex
    SET
      status = 'stopped',
      stop_reason = 'lead_replied',
      completed_at = now(),
      last_activity_at = now(),
      updated_at = now()
    FROM public.automation_flows af
    WHERE ex.flow_id = af.id
      AND ex.agency_id = p_agency_id
      AND ex.lead_id = p_lead_id
      AND ex.status IN ('running', 'waiting')
      AND COALESCE(NULLIF(af.stop_rules ->> 'stop_on_reply', '')::boolean, true)
    RETURNING ex.id, ex.flow_id
  LOOP
    stopped_count := stopped_count + 1;

    UPDATE public.automation_pending_actions
    SET status = 'cancelled',
        last_error = 'lead_replied',
        updated_at = now()
    WHERE execution_id = stopped_row.id
      AND status IN ('pending', 'processing');

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
      stopped_row.id,
      stopped_row.flow_id,
      p_agency_id,
      p_lead_id,
      'lead_replied',
      'Lead respondeu no WhatsApp.',
      COALESCE(p_payload, '{}'::jsonb) || jsonb_build_object('conversation_id', p_conversation_id)
    );

    PERFORM public.increment_automation_flow_metric(stopped_row.flow_id, 'stopped', 1);
    PERFORM public.increment_automation_flow_metric(stopped_row.flow_id, 'responses_received', 1);
  END LOOP;

  RETURN stopped_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_automation_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.start_automation_flows_for_lead(
    NEW.agency_id,
    NEW.id,
    'lead_created',
    jsonb_build_object(
      'source', NEW.source,
      'status', NEW.status,
      'phone', NEW.phone,
      'company', NEW.company
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_automation_lead_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.start_automation_flows_for_lead(
      NEW.agency_id,
      NEW.id,
      'lead_status_changed',
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
    );

    PERFORM public.start_automation_flows_for_lead(
      NEW.agency_id,
      NEW.id,
      'pipeline_stage_entered',
      jsonb_build_object('old_stage', OLD.status, 'new_stage', NEW.status)
    );
  END IF;

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    PERFORM public.start_automation_flows_for_lead(
      NEW.agency_id,
      NEW.id,
      'owner_changed',
      jsonb_build_object('old_owner', OLD.assigned_to, 'new_owner', NEW.assigned_to)
    );

    IF COALESCE(NULLIF(NEW.assigned_to::text, ''), '') <> '' THEN
      UPDATE public.automation_executions
      SET status = 'stopped',
          stop_reason = 'owner_changed',
          completed_at = now(),
          last_activity_at = now(),
          updated_at = now()
      WHERE agency_id = NEW.agency_id
        AND lead_id = NEW.id
        AND status IN ('running', 'waiting')
        AND EXISTS (
          SELECT 1
          FROM public.automation_flows af
          WHERE af.id = automation_executions.flow_id
            AND COALESCE(NULLIF(af.stop_rules ->> 'stop_on_manual_owner_change', '')::boolean, false)
        );
    END IF;
  END IF;

  IF COALESCE(NEW.tags, ARRAY[]::text[]) IS DISTINCT FROM COALESCE(OLD.tags, ARRAY[]::text[]) THEN
    PERFORM public.start_automation_flows_for_lead(
      NEW.agency_id,
      NEW.id,
      'tag_added',
      jsonb_build_object(
        'old_tags', COALESCE(OLD.tags, ARRAY[]::text[]),
        'new_tags', COALESCE(NEW.tags, ARRAY[]::text[])
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_automation_whatsapp_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_agency_id uuid;
BEGIN
  IF COALESCE(NEW.is_from_me, false) OR NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT agency_id
  INTO msg_agency_id
  FROM public.whatsapp_accounts
  WHERE id = NEW.account_id;

  IF msg_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.stop_automation_flows_for_lead_reply(
    msg_agency_id,
    NEW.lead_id,
    NEW.conversation_id,
    jsonb_build_object(
      'message_id', NEW.message_id,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'phone_number', NEW.phone_number
    )
  );

  PERFORM public.start_automation_flows_for_lead(
    msg_agency_id,
    NEW.lead_id,
    'whatsapp_message_received',
    jsonb_build_object(
      'message_id', NEW.message_id,
      'content', NEW.content,
      'message_type', NEW.message_type,
      'phone_number', NEW.phone_number,
      'conversation_id', NEW.conversation_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_lead_created ON public.leads;
CREATE TRIGGER automation_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_automation_lead_insert();

DROP TRIGGER IF EXISTS automation_lead_updated ON public.leads;
CREATE TRIGGER automation_lead_updated
  AFTER UPDATE OF status, assigned_to, tags ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_automation_lead_update();

DROP TRIGGER IF EXISTS automation_whatsapp_message_inserted ON public.whatsapp_messages;
CREATE TRIGGER automation_whatsapp_message_inserted
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_automation_whatsapp_message_insert();
