-- Log when a pending action that was waiting for a send window is released to the worker.

CREATE OR REPLACE FUNCTION public.automation_log_schedule_window_resumes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_row record;
  current_ts timestamptz := now();
  next_run_at timestamptz;
  resumed_count integer := 0;
BEGIN
  FOR pending_row IN
    SELECT
      p.*,
      af.trigger_config,
      ex.status AS execution_status
    FROM public.automation_pending_actions p
    JOIN public.automation_flows af ON af.id = p.flow_id
    JOIN public.automation_executions ex ON ex.id = p.execution_id
    WHERE p.status = 'pending'
      AND p.run_at <= current_ts
      AND af.status = 'active'
      AND af.is_deleted = false
      AND ex.status IN ('running', 'waiting')
      AND COALESCE((p.payload ->> '__schedule_window_waiting')::boolean, false)
  LOOP
    next_run_at := public.automation_next_schedule_run_at(pending_row.trigger_config -> 'schedule_window', current_ts);

    IF next_run_at <= current_ts + interval '1 second' THEN
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
        'schedule_window_resumed',
        'Execucao retomada dentro da janela permitida.',
        jsonb_build_object(
          'scheduled_run_at', pending_row.payload ->> '__schedule_window_next_run_at',
          'timezone', COALESCE(pending_row.trigger_config #>> '{schedule_window,timezone}', 'America/Sao_Paulo')
        )
      );

      UPDATE public.automation_pending_actions
      SET payload = COALESCE(payload, '{}'::jsonb) - '__schedule_window_waiting' - '__schedule_window_next_run_at',
          last_error = NULL,
          updated_at = current_ts
      WHERE id = pending_row.id;

      resumed_count := resumed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('resumed', resumed_count);
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
  SELECT public.automation_log_schedule_window_resumes();

  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-automation-pending-actions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
