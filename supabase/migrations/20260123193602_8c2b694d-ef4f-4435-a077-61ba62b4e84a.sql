-- Fix: Postgres does not support CREATE POLICY IF NOT EXISTS.
-- Also: create apply_task_event_rules before functions that call it.

-- 1) Granular per-user event preferences
CREATE TABLE IF NOT EXISTS public.notification_event_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, agency_id, event_key)
);

ALTER TABLE public.notification_event_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_event_preferences' AND policyname='Users can view their own notification event prefs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can view their own notification event prefs" ON public.notification_event_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_event_preferences' AND policyname='Users can insert their own notification event prefs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own notification event prefs" ON public.notification_event_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_event_preferences' AND policyname='Users can update their own notification event prefs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own notification event prefs" ON public.notification_event_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='notification_event_preferences' AND policyname='Users can delete their own notification event prefs'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can delete their own notification event prefs" ON public.notification_event_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 2) Agency-wide rules (admin-only)
CREATE TABLE IF NOT EXISTS public.agency_notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  recipients_strategy text NOT NULL, -- 'admins' | 'creator' | 'assignees' | 'creator_and_admins'
  conditions jsonb NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (agency_id, event_key, recipients_strategy)
);

ALTER TABLE public.agency_notification_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agency_notification_rules' AND policyname='Admins can read agency notification rules'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can read agency notification rules" ON public.agency_notification_rules FOR SELECT TO authenticated USING (public.is_agency_admin(agency_id))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agency_notification_rules' AND policyname='Admins can insert agency notification rules'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can insert agency notification rules" ON public.agency_notification_rules FOR INSERT TO authenticated WITH CHECK (public.is_agency_admin(agency_id))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agency_notification_rules' AND policyname='Admins can update agency notification rules'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update agency notification rules" ON public.agency_notification_rules FOR UPDATE TO authenticated USING (public.is_agency_admin(agency_id))';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='agency_notification_rules' AND policyname='Admins can delete agency notification rules'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can delete agency notification rules" ON public.agency_notification_rules FOR DELETE TO authenticated USING (public.is_agency_admin(agency_id))';
  END IF;
END $$;

-- 3) Helper functions
CREATE OR REPLACE FUNCTION public.get_event_pref_enabled(
  p_user_id uuid,
  p_agency_id uuid,
  p_event_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT enabled
     FROM public.notification_event_preferences
     WHERE user_id = p_user_id
       AND agency_id = p_agency_id
       AND event_key = p_event_key
     LIMIT 1),
    true
  );
$$;

CREATE OR REPLACE FUNCTION public.check_notification_type_enabled(
  p_user_id uuid,
  p_agency_id uuid,
  p_type text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prefs record;
BEGIN
  SELECT * INTO prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id AND agency_id = p_agency_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN true;
  END IF;

  CASE p_type
    WHEN 'tasks' THEN RETURN COALESCE(prefs.tasks_enabled, true);
    WHEN 'leads' THEN RETURN COALESCE(prefs.leads_enabled, true);
    WHEN 'meetings' THEN RETURN COALESCE(prefs.meetings_enabled, true);
    WHEN 'posts' THEN RETURN COALESCE(prefs.posts_enabled, true);
    WHEN 'payments' THEN RETURN COALESCE(prefs.payments_enabled, true);
    WHEN 'expenses' THEN RETURN COALESCE(prefs.expenses_enabled, true);
    WHEN 'reminders' THEN RETURN COALESCE(prefs.reminders_enabled, true);
    WHEN 'system' THEN RETURN COALESCE(prefs.system_enabled, true);
    ELSE RETURN true;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.should_notify_user_for_event(
  p_user_id uuid,
  p_agency_id uuid,
  p_type text,
  p_event_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.check_notification_type_enabled(p_user_id, p_agency_id, p_type) THEN
    RETURN false;
  END IF;

  IF NOT public.get_event_pref_enabled(p_user_id, p_agency_id, p_event_key) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 4) Agency rules applier (task events)
CREATE OR REPLACE FUNCTION public.apply_task_event_rules(
  p_agency_id uuid,
  p_event_key text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  admin_user record;
  creator_id uuid;
  task_title text;
  task_id uuid;
BEGIN
  task_id := (p_payload->>'task_id')::uuid;

  IF task_id IS NOT NULL THEN
    SELECT title, created_by INTO task_title, creator_id
    FROM public.tasks
    WHERE id = task_id
    LIMIT 1;
  END IF;

  FOR r IN
    SELECT *
    FROM public.agency_notification_rules
    WHERE agency_id = p_agency_id
      AND event_key = p_event_key
      AND enabled = true
  LOOP
    IF r.conditions ? 'to' THEN
      IF (p_payload->>'to') IS DISTINCT FROM (r.conditions->>'to') THEN
        CONTINUE;
      END IF;
    END IF;

    IF r.recipients_strategy = 'admins' THEN
      FOR admin_user IN
        SELECT user_id
        FROM public.agency_users
        WHERE agency_id = p_agency_id
          AND role IN ('owner','admin')
      LOOP
        IF public.should_notify_user_for_event(admin_user.user_id, p_agency_id, 'tasks', p_event_key) THEN
          INSERT INTO public.notifications (
            user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
          ) VALUES (
            admin_user.user_id,
            p_agency_id,
            'task',
            'medium',
            '📣 Alerta do time (Tarefas)',
            COALESCE(task_title, 'Tarefa'),
            '/tasks',
            'Ver tarefa',
            jsonb_build_object('event', p_event_key, 'task_id', task_id, 'audience', 'admins', 'rule_id', r.id)
          );
        END IF;
      END LOOP;

    ELSIF r.recipients_strategy = 'creator' THEN
      IF creator_id IS NOT NULL AND public.should_notify_user_for_event(creator_id, p_agency_id, 'tasks', p_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          creator_id,
          p_agency_id,
          'task',
          'medium',
          '📣 Alerta do time (Tarefas)',
          COALESCE(task_title, 'Tarefa'),
          '/tasks',
          'Ver tarefa',
          jsonb_build_object('event', p_event_key, 'task_id', task_id, 'audience', 'creator', 'rule_id', r.id)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 5) Task event triggers -> notifications
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
  v_event_key text := 'task.assigned';
BEGIN
  SELECT id, title, agency_id
  INTO t
  FROM public.tasks
  WHERE id = NEW.task_id
  LIMIT 1;

  IF t.id IS NULL OR t.agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.should_notify_user_for_event(NEW.user_id, t.agency_id, 'tasks', v_event_key) THEN
    INSERT INTO public.notifications (
      user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
    ) VALUES (
      NEW.user_id,
      t.agency_id,
      'task',
      'medium',
      '✅ Tarefa atribuída a você',
      t.title,
      '/tasks',
      'Ver tarefa',
      jsonb_build_object('event', v_event_key, 'task_id', NEW.task_id, 'assigned_by', NEW.assigned_by, 'play_sound', true)
    );
  END IF;

  PERFORM public.apply_task_event_rules(t.agency_id, v_event_key, jsonb_build_object('task_id', NEW.task_id, 'assigned_by', NEW.assigned_by));

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_update_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_id uuid := NEW.agency_id;
  v_status_changed boolean := (OLD.status IS DISTINCT FROM NEW.status);
  v_important_changed boolean := (
    OLD.due_date IS DISTINCT FROM NEW.due_date OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.title IS DISTINCT FROM NEW.title
  );
  assignee record;
  v_event_key text;
BEGIN
  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_status_changed THEN
    v_event_key := 'task.status_changed';

    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          assignee.user_id,
          v_agency_id,
          'task',
          'medium',
          '🔄 Status de tarefa atualizado',
          NEW.title,
          '/tasks',
          'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id, 'from', OLD.status, 'to', NEW.status)
        );
      END IF;
    END LOOP;

    IF NEW.created_by IS NOT NULL THEN
      IF public.should_notify_user_for_event(NEW.created_by, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          NEW.created_by,
          v_agency_id,
          'task',
          'medium',
          '🔄 Status de tarefa atualizado',
          NEW.title,
          '/tasks',
          'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id, 'from', OLD.status, 'to', NEW.status, 'audience', 'creator')
        );
      END IF;
    END IF;

    PERFORM public.apply_task_event_rules(v_agency_id, v_event_key, jsonb_build_object('task_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;

  IF v_important_changed THEN
    v_event_key := 'task.updated_important';

    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          assignee.user_id,
          v_agency_id,
          'task',
          'low',
          '✏️ Tarefa atualizada',
          NEW.title,
          '/tasks',
          'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id)
        );
      END IF;
    END LOOP;

    PERFORM public.apply_task_event_rules(v_agency_id, v_event_key, jsonb_build_object('task_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers
DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.task_assignments;
CREATE TRIGGER trg_notify_task_assignment
AFTER INSERT ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

DROP TRIGGER IF EXISTS trg_notify_task_update_events ON public.tasks;
CREATE TRIGGER trg_notify_task_update_events
AFTER UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_update_events();

-- updated_at triggers
DROP TRIGGER IF EXISTS update_notification_event_preferences_updated_at ON public.notification_event_preferences;
CREATE TRIGGER update_notification_event_preferences_updated_at
BEFORE UPDATE ON public.notification_event_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agency_notification_rules_updated_at ON public.agency_notification_rules;
CREATE TRIGGER update_agency_notification_rules_updated_at
BEFORE UPDATE ON public.agency_notification_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();