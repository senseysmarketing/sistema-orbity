
-- 1. Add columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS action_type TEXT;

-- 2. Partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS unique_notification_event
  ON public.notifications (user_id, entity_type, entity_id, action_type)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL;

-- 3. Update notify_task_assignment
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
      entity_type, entity_id, action_type
    ) VALUES (
      NEW.user_id,
      t.agency_id,
      'task',
      'medium',
      '✅ Tarefa atribuída a você',
      t.title,
      '/tasks',
      'Ver tarefa',
      jsonb_build_object('event', v_event_key, 'task_id', NEW.task_id, 'assigned_by', NEW.assigned_by, 'play_sound', true),
      'task',
      NEW.task_id,
      'assigned'
    )
    ON CONFLICT (user_id, entity_type, entity_id, action_type)
    WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
    DO NOTHING;
  END IF;

  PERFORM public.apply_task_event_rules(t.agency_id, v_event_key, jsonb_build_object('task_id', NEW.task_id, 'assigned_by', NEW.assigned_by));

  RETURN NEW;
END;
$function$;

-- 4. Update notify_task_update_events
CREATE OR REPLACE FUNCTION public.notify_task_update_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid := NEW.agency_id;
  v_updated_by uuid := NEW.updated_by;
  v_status_changed boolean := (OLD.status IS DISTINCT FROM NEW.status);
  v_important_changed boolean := (
    OLD.due_date IS DISTINCT FROM NEW.due_date OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.title IS DISTINCT FROM NEW.title
  );
  assignee record;
  v_event_key text;
  v_action_type text;
  v_creator_is_assignee boolean := false;
BEGIN
  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.created_by IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.task_assignments 
      WHERE task_id = NEW.id AND user_id = NEW.created_by
    ) INTO v_creator_is_assignee;
  END IF;

  IF v_status_changed THEN
    v_event_key := 'task.status_changed';
    v_action_type := 'status_changed_to_' || NEW.status;

    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      IF v_updated_by IS NOT NULL AND assignee.user_id = v_updated_by THEN
        CONTINUE;
      END IF;
      
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
          entity_type, entity_id, action_type
        ) VALUES (
          assignee.user_id, v_agency_id, 'task', 'medium',
          '🔄 Status de tarefa atualizado', NEW.title, '/tasks', 'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id, 'from', OLD.status, 'to', NEW.status),
          'task', NEW.id, v_action_type
        )
        ON CONFLICT (user_id, entity_type, entity_id, action_type)
        WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
        DO NOTHING;
      END IF;
    END LOOP;

    IF NEW.created_by IS NOT NULL 
       AND (v_updated_by IS NULL OR NEW.created_by <> v_updated_by)
       AND NOT v_creator_is_assignee THEN
      IF public.should_notify_user_for_event(NEW.created_by, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
          entity_type, entity_id, action_type
        ) VALUES (
          NEW.created_by, v_agency_id, 'task', 'medium',
          '🔄 Status de tarefa atualizado', NEW.title, '/tasks', 'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id, 'from', OLD.status, 'to', NEW.status, 'audience', 'creator'),
          'task', NEW.id, v_action_type || '_creator'
        )
        ON CONFLICT (user_id, entity_type, entity_id, action_type)
        WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
        DO NOTHING;
      END IF;
    END IF;

    PERFORM public.apply_task_event_rules(v_agency_id, v_event_key, jsonb_build_object('task_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
  END IF;

  IF v_important_changed THEN
    v_event_key := 'task.updated_important';

    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      IF v_updated_by IS NOT NULL AND assignee.user_id = v_updated_by THEN
        CONTINUE;
      END IF;
      
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'tasks', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
          entity_type, entity_id, action_type
        ) VALUES (
          assignee.user_id, v_agency_id, 'task', 'low',
          '✏️ Tarefa atualizada', NEW.title, '/tasks', 'Ver tarefa',
          jsonb_build_object('event', v_event_key, 'task_id', NEW.id),
          'task', NEW.id, 'updated_important'
        )
        ON CONFLICT (user_id, entity_type, entity_id, action_type)
        WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
        DO NOTHING;
      END IF;
    END LOOP;

    PERFORM public.apply_task_event_rules(v_agency_id, v_event_key, jsonb_build_object('task_id', NEW.id));
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Update apply_task_event_rules
CREATE OR REPLACE FUNCTION public.apply_task_event_rules(p_agency_id uuid, p_event_key text, p_payload jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
            entity_type, entity_id, action_type
          ) VALUES (
            admin_user.user_id, p_agency_id, 'task', 'medium',
            '📣 Alerta do time (Tarefas)', COALESCE(task_title, 'Tarefa'), '/tasks', 'Ver tarefa',
            jsonb_build_object('event', p_event_key, 'task_id', task_id, 'audience', 'admins', 'rule_id', r.id),
            'task', task_id, p_event_key || '_rule_' || r.id::text
          )
          ON CONFLICT (user_id, entity_type, entity_id, action_type)
          WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
          DO NOTHING;
        END IF;
      END LOOP;

    ELSIF r.recipients_strategy = 'creator' THEN
      IF creator_id IS NOT NULL AND public.should_notify_user_for_event(creator_id, p_agency_id, 'tasks', p_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata,
          entity_type, entity_id, action_type
        ) VALUES (
          creator_id, p_agency_id, 'task', 'medium',
          '📣 Alerta do time (Tarefas)', COALESCE(task_title, 'Tarefa'), '/tasks', 'Ver tarefa',
          jsonb_build_object('event', p_event_key, 'task_id', task_id, 'audience', 'creator', 'rule_id', r.id),
          'task', task_id, p_event_key || '_rule_creator_' || r.id::text
        )
        ON CONFLICT (user_id, entity_type, entity_id, action_type)
        WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL
        DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$function$;
