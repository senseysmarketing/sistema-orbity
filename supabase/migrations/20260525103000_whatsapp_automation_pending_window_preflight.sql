-- Guard due pending actions before the HTTP worker runs, so delayed messages never leave outside a flow window.

CREATE OR REPLACE FUNCTION public.automation_schedule_window_enabled(p_window jsonb DEFAULT '{}'::jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(COALESCE(p_window ->> 'enabled', 'false')) IN ('true', '1', 'yes', 'sim');
$$;

CREATE OR REPLACE FUNCTION public.automation_reschedule_pending_actions_for_windows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_row record;
  current_ts timestamptz := now();
  next_run_at timestamptz;
  rescheduled_count integer := 0;
  cancelled_count integer := 0;
BEGIN
  FOR pending_row IN
    SELECT
      p.*,
      af.status AS flow_status,
      af.is_deleted AS flow_deleted,
      af.trigger_config,
      af.stop_rules,
      ex.status AS execution_status,
      l.status AS lead_status
    FROM public.automation_pending_actions p
    JOIN public.automation_flows af ON af.id = p.flow_id
    JOIN public.automation_executions ex ON ex.id = p.execution_id
    LEFT JOIN public.leads l ON l.id = p.lead_id
    WHERE p.status = 'pending'
      AND p.run_at <= current_ts
    ORDER BY p.run_at
    LIMIT 100
  LOOP
    IF pending_row.flow_status <> 'active' OR pending_row.flow_deleted THEN
      UPDATE public.automation_pending_actions
      SET status = 'cancelled',
          last_error = 'flow_inactive',
          updated_at = current_ts
      WHERE id = pending_row.id;

      UPDATE public.automation_executions
      SET status = 'stopped',
          stop_reason = 'flow_inactive',
          completed_at = current_ts,
          last_activity_at = current_ts,
          updated_at = current_ts
      WHERE id = pending_row.execution_id
        AND status IN ('running', 'waiting', 'paused');

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
        pending_row.execution_id,
        pending_row.flow_id,
        pending_row.agency_id,
        pending_row.lead_id,
        pending_row.step_id,
        'schedule_window_cancelled',
        'Execucao cancelada porque o fluxo ficou inativo antes do horario agendado.',
        jsonb_build_object('pending_action_id', pending_row.id)
      );

      cancelled_count := cancelled_count + 1;
      CONTINUE;
    END IF;

    IF pending_row.execution_status NOT IN ('running', 'waiting') THEN
      UPDATE public.automation_pending_actions
      SET status = 'cancelled',
          last_error = 'execution_unavailable',
          updated_at = current_ts
      WHERE id = pending_row.id;

      cancelled_count := cancelled_count + 1;
      CONTINUE;
    END IF;

    IF pending_row.lead_status IS NULL THEN
      UPDATE public.automation_pending_actions
      SET status = 'cancelled',
          last_error = 'lead_not_found',
          updated_at = current_ts
      WHERE id = pending_row.id;

      UPDATE public.automation_executions
      SET status = 'stopped',
          stop_reason = 'lead_not_found',
          completed_at = current_ts,
          last_activity_at = current_ts,
          updated_at = current_ts
      WHERE id = pending_row.execution_id;

      cancelled_count := cancelled_count + 1;
      CONTINUE;
    END IF;

    IF COALESCE(NULLIF(pending_row.stop_rules ->> 'stop_on_final_status', '')::boolean, true)
      AND lower(pending_row.lead_status) IN ('won', 'vendas', 'ganho', 'fechado', 'cliente', 'closed', 'lost', 'perdido', 'loss')
    THEN
      UPDATE public.automation_pending_actions
      SET status = 'cancelled',
          last_error = 'lead_final_status',
          updated_at = current_ts
      WHERE id = pending_row.id;

      UPDATE public.automation_executions
      SET status = 'stopped',
          stop_reason = 'lead_final_status',
          completed_at = current_ts,
          last_activity_at = current_ts,
          updated_at = current_ts
      WHERE id = pending_row.execution_id;

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
        pending_row.execution_id,
        pending_row.flow_id,
        pending_row.agency_id,
        pending_row.lead_id,
        pending_row.step_id,
        'automation_stopped',
        'Execucao cancelada por etapa final antes do horario agendado.',
        jsonb_build_object('lead_status', pending_row.lead_status)
      );

      cancelled_count := cancelled_count + 1;
      CONTINUE;
    END IF;

    IF public.automation_schedule_window_enabled(pending_row.trigger_config -> 'schedule_window') THEN
      next_run_at := public.automation_next_schedule_run_at(pending_row.trigger_config -> 'schedule_window', current_ts);

      IF next_run_at > current_ts + interval '1 second' THEN
        UPDATE public.automation_pending_actions
        SET status = 'pending',
            locked_at = NULL,
            run_at = next_run_at,
            last_error = 'waiting_schedule_window',
            payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
              '__schedule_window_waiting', true,
              '__schedule_window_next_run_at', next_run_at
            ),
            updated_at = current_ts
        WHERE id = pending_row.id;

        UPDATE public.automation_executions
        SET status = 'waiting',
            current_step_id = pending_row.step_id,
            last_activity_at = current_ts,
            updated_at = current_ts
        WHERE id = pending_row.execution_id;

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
          pending_row.execution_id,
          pending_row.flow_id,
          pending_row.agency_id,
          pending_row.lead_id,
          pending_row.step_id,
          'schedule_window_rescheduled',
          'Execucao reagendada para o proximo horario permitido.',
          jsonb_build_object(
            'next_run_at', next_run_at,
            'timezone', COALESCE(pending_row.trigger_config #>> '{schedule_window,timezone}', 'America/Sao_Paulo'),
            'action_type', pending_row.action_type
          )
        );

        rescheduled_count := rescheduled_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'rescheduled', rescheduled_count,
    'cancelled', cancelled_count
  );
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-automation-flows') THEN
    PERFORM cron.unschedule('process-whatsapp-automation-flows');
  END IF;
END $$;

SELECT cron.schedule(
  'process-whatsapp-automation-flows',
  '* * * * *',
  $$
  SELECT public.automation_reschedule_pending_actions_for_windows();

  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-automation-pending-actions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
