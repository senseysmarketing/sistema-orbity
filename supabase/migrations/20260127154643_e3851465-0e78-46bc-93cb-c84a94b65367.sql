-- =============================================
-- FIX: Prevent duplicate notifications when creator is also assignee
-- =============================================

-- 1. Update notify_task_update_events to check if creator is assignee
CREATE OR REPLACE FUNCTION public.notify_task_update_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_creator_is_assignee boolean := false;
BEGIN
  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if creator is also an assignee (to avoid duplicate notifications)
  IF NEW.created_by IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.task_assignments 
      WHERE task_id = NEW.id AND user_id = NEW.created_by
    ) INTO v_creator_is_assignee;
  END IF;

  IF v_status_changed THEN
    v_event_key := 'task.status_changed';

    -- Notify all assignees
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

    -- Notify creator ONLY if they are NOT an assignee (to avoid duplicate)
    IF NEW.created_by IS NOT NULL AND NOT v_creator_is_assignee THEN
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
$function$;

-- 2. Update notify_post_assignment to check if creator is assignee
CREATE OR REPLACE FUNCTION public.notify_post_assignment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  v_event_key text := 'post.assigned';
BEGIN
  SELECT id, title, agency_id, created_by
  INTO p
  FROM public.social_media_posts
  WHERE id = NEW.post_id
  LIMIT 1;

  IF p.id IS NULL OR p.agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify assignee
  IF public.should_notify_user_for_event(NEW.user_id, p.agency_id, 'posts', v_event_key) THEN
    INSERT INTO public.notifications (
      user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
    ) VALUES (
      NEW.user_id,
      p.agency_id,
      'post',
      'medium',
      '📌 Post atribuído a você',
      COALESCE(p.title, 'Post'),
      '/dashboard/social-media',
      'Ver post',
      jsonb_build_object('event', v_event_key, 'post_id', NEW.post_id, 'assigned_by', NEW.assigned_by, 'play_sound', true)
    );
  END IF;

  -- Notify creator ONLY if they are NOT the assignee (to avoid duplicate)
  IF p.created_by IS NOT NULL AND p.created_by <> NEW.user_id THEN
    IF public.should_notify_user_for_event(p.created_by, p.agency_id, 'posts', v_event_key) THEN
      INSERT INTO public.notifications (
        user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
      ) VALUES (
        p.created_by,
        p.agency_id,
        'post',
        'low',
        '📌 Post atribuído',
        COALESCE(p.title, 'Post'),
        '/dashboard/social-media',
        'Ver post',
        jsonb_build_object('event', v_event_key, 'post_id', NEW.post_id, 'audience', 'creator')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;