-- WhatsApp Automation Flows
-- Replaces the legacy WhatsApp cadence tables/workers as the official engine.

CREATE TABLE IF NOT EXISTS public.automation_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'inactive',
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  stop_rules jsonb NOT NULL DEFAULT '{
    "stop_on_reply": true,
    "stop_on_final_status": true,
    "stop_on_manual_owner_change": false,
    "stop_on_tag_added": "",
    "avoid_conflicts": true
  }'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{
    "entered": 0,
    "messages_sent": 0,
    "responses_received": 0,
    "completed": 0,
    "stopped": 0,
    "errors": 0
  }'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_flows_status_check CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE IF NOT EXISTS public.automation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  position integer NOT NULL,
  step_type text NOT NULL,
  title text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  next_step_id uuid REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_steps_type_check CHECK (
    step_type IN ('condition', 'send_whatsapp', 'send_whatsapp_media', 'delay', 'action', 'branch', 'end')
  ),
  CONSTRAINT automation_steps_position_positive CHECK (position > 0)
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running',
  current_step_id uuid REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  trigger_type text NOT NULL,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  stop_reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_executions_status_check CHECK (
    status IN ('running', 'waiting', 'paused', 'completed', 'stopped', 'failed')
  )
);

CREATE TABLE IF NOT EXISTS public.automation_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  flow_id uuid NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT automation_pending_actions_status_check CHECK (
    status IN ('pending', 'processing', 'done', 'failed', 'cancelled')
  )
);

CREATE TABLE IF NOT EXISTS public.automation_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_flows_agency_status
  ON public.automation_flows(agency_id, status)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger
  ON public.automation_flows(agency_id, trigger_type, status)
  WHERE is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_steps_flow_position
  ON public.automation_steps(flow_id, position)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_automation_steps_agency
  ON public.automation_steps(agency_id, flow_id, position)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_automation_executions_agency_status
  ON public.automation_executions(agency_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_executions_lead
  ON public.automation_executions(agency_id, lead_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_executions_active_flow_lead
  ON public.automation_executions(flow_id, lead_id)
  WHERE status IN ('running', 'waiting');

CREATE INDEX IF NOT EXISTS idx_automation_pending_due
  ON public.automation_pending_actions(status, run_at, locked_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_automation_pending_execution
  ON public.automation_pending_actions(execution_id, status);

CREATE INDEX IF NOT EXISTS idx_automation_logs_execution
  ON public.automation_execution_logs(execution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_automation_logs_agency
  ON public.automation_execution_logs(agency_id, created_at DESC);

ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view automation flows" ON public.automation_flows;
CREATE POLICY "Members can view automation flows"
  ON public.automation_flows FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Admins can manage automation flows" ON public.automation_flows;
CREATE POLICY "Admins can manage automation flows"
  ON public.automation_flows FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Members can view automation steps" ON public.automation_steps;
CREATE POLICY "Members can view automation steps"
  ON public.automation_steps FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Admins can manage automation steps" ON public.automation_steps;
CREATE POLICY "Admins can manage automation steps"
  ON public.automation_steps FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Members can view automation executions" ON public.automation_executions;
CREATE POLICY "Members can view automation executions"
  ON public.automation_executions FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Admins can manage automation executions" ON public.automation_executions;
CREATE POLICY "Admins can manage automation executions"
  ON public.automation_executions FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Members can view automation pending actions" ON public.automation_pending_actions;
CREATE POLICY "Members can view automation pending actions"
  ON public.automation_pending_actions FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Admins can manage automation pending actions" ON public.automation_pending_actions;
CREATE POLICY "Admins can manage automation pending actions"
  ON public.automation_pending_actions FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

DROP POLICY IF EXISTS "Members can view automation execution logs" ON public.automation_execution_logs;
CREATE POLICY "Members can view automation execution logs"
  ON public.automation_execution_logs FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "Admins can manage automation execution logs" ON public.automation_execution_logs;
CREATE POLICY "Admins can manage automation execution logs"
  ON public.automation_execution_logs FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_flows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_pending_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_execution_logs TO authenticated;

DROP TRIGGER IF EXISTS update_automation_flows_updated_at ON public.automation_flows;
CREATE TRIGGER update_automation_flows_updated_at
  BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_steps_updated_at ON public.automation_steps;
CREATE TRIGGER update_automation_steps_updated_at
  BEFORE UPDATE ON public.automation_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_executions_updated_at ON public.automation_executions;
CREATE TRIGGER update_automation_executions_updated_at
  BEFORE UPDATE ON public.automation_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_pending_actions_updated_at ON public.automation_pending_actions;
CREATE TRIGGER update_automation_pending_actions_updated_at
  BEFORE UPDATE ON public.automation_pending_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safe legacy shutdown: preserve history, stop queued cadence sends, and make templates inactive.
UPDATE public.whatsapp_automation_control
SET
  status = 'finished',
  next_execution_at = NULL,
  conversation_state = 'legacy_disabled_by_automation_flows',
  updated_at = now()
WHERE status IN ('active', 'processing', 'paused');

UPDATE public.whatsapp_message_templates
SET is_active = false, updated_at = now()
WHERE is_active = true;

UPDATE public.agencies
SET
  whatsapp_auto_contact = false,
  whatsapp_auto_ghosting = false,
  updated_at = now()
WHERE whatsapp_auto_contact = true OR whatsapp_auto_ghosting = true;

-- Replace legacy cron jobs with the new persistent pending-action worker.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-queue') THEN
    PERFORM cron.unschedule('process-whatsapp-queue');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-ghosting') THEN
    PERFORM cron.unschedule('process-whatsapp-ghosting');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-lead-ghosting-hourly') THEN
    PERFORM cron.unschedule('process-lead-ghosting-hourly');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-whatsapp-automation-flows') THEN
    PERFORM cron.unschedule('process-whatsapp-automation-flows');
  END IF;
END $$;

SELECT cron.schedule(
  'process-whatsapp-automation-flows',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-automation-pending-actions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
