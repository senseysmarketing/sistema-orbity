-- Adicionar campo updated_by às tabelas tasks e social_media_posts
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.social_media_posts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON public.tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_updated_by ON public.social_media_posts(updated_by);

-- Atualizar trigger notify_task_update_events para excluir quem fez a ação
CREATE OR REPLACE FUNCTION public.notify_task_update_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid := NEW.agency_id;
  v_updated_by uuid := NEW.updated_by;  -- Quem fez a ação
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

    -- Notify all assignees EXCEPT the one who made the change
    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      -- Skip if this user made the change
      IF v_updated_by IS NOT NULL AND assignee.user_id = v_updated_by THEN
        CONTINUE;
      END IF;
      
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

    -- Notify creator ONLY if:
    -- 1. Creator exists
    -- 2. Creator is NOT the one who made the change
    -- 3. Creator is NOT already an assignee (to avoid duplicate)
    IF NEW.created_by IS NOT NULL 
       AND (v_updated_by IS NULL OR NEW.created_by <> v_updated_by)
       AND NOT v_creator_is_assignee THEN
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
      -- Skip if this user made the change
      IF v_updated_by IS NOT NULL AND assignee.user_id = v_updated_by THEN
        CONTINUE;
      END IF;
      
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

-- Atualizar trigger notify_post_update_events para excluir quem fez a ação
CREATE OR REPLACE FUNCTION public.notify_post_update_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_key TEXT;
  v_recipients UUID[];
  v_post_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_client_name TEXT;
  v_recipient_id UUID;
  v_updated_by UUID := NEW.updated_by;  -- Quem fez a ação
BEGIN
  -- Get post title
  v_post_title := COALESCE(NEW.title, 'Post sem título');
  
  -- Get client name (singular client_id, not client_ids)
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_new_status := NEW.status;

  -- STATUS CHANGE EVENT
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_key := 'post.status_changed';
    
    SELECT ARRAY_AGG(user_id) INTO v_recipients
    FROM post_assignments
    WHERE post_id = NEW.id;
    
    -- Include creator if not in recipients
    IF NEW.created_by IS NOT NULL THEN
      IF v_recipients IS NULL THEN
        v_recipients := ARRAY[NEW.created_by];
      ELSIF NOT (NEW.created_by = ANY(v_recipients)) THEN
        v_recipients := array_append(v_recipients, NEW.created_by);
      END IF;
    END IF;
    
    -- Notify recipients EXCEPT the one who made the change
    IF v_recipients IS NOT NULL THEN
      FOREACH v_recipient_id IN ARRAY v_recipients LOOP
        -- Skip if this user made the change
        IF v_updated_by IS NOT NULL AND v_recipient_id = v_updated_by THEN
          CONTINUE;
        END IF;
        
        IF public.should_notify_user_for_event(v_recipient_id, NEW.agency_id, 'posts', v_event_key) THEN
          INSERT INTO public.notifications (
            user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
          ) VALUES (
            v_recipient_id,
            NEW.agency_id,
            'post',
            'medium',
            '🔄 Status de post atualizado',
            v_post_title,
            '/dashboard/social-media',
            'Ver post',
            jsonb_build_object(
              'event', v_event_key, 
              'post_id', NEW.id, 
              'from', v_old_status, 
              'to', v_new_status,
              'client_name', v_client_name
            )
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Apply agency rules for published posts
    IF v_new_status = 'published' THEN
      PERFORM public.apply_post_event_rules(
        NEW.agency_id, 
        'post.published', 
        jsonb_build_object('post_id', NEW.id)
      );
    END IF;
  END IF;

  -- IMPORTANT FIELDS UPDATED (use scheduled_date, not scheduled_for)
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.title IS DISTINCT FROM OLD.title OR
       NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
       NEW.priority IS DISTINCT FROM OLD.priority THEN
      
      v_event_key := 'post.updated_important';
      
      SELECT ARRAY_AGG(user_id) INTO v_recipients
      FROM post_assignments
      WHERE post_id = NEW.id;
      
      IF v_recipients IS NOT NULL THEN
        FOREACH v_recipient_id IN ARRAY v_recipients LOOP
          -- Skip if this user made the change
          IF v_updated_by IS NOT NULL AND v_recipient_id = v_updated_by THEN
            CONTINUE;
          END IF;
          
          IF public.should_notify_user_for_event(v_recipient_id, NEW.agency_id, 'posts', v_event_key) THEN
            INSERT INTO public.notifications (
              user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
            ) VALUES (
              v_recipient_id,
              NEW.agency_id,
              'post',
              'low',
              '✏️ Post atualizado',
              v_post_title,
              '/dashboard/social-media',
              'Ver post',
              jsonb_build_object('event', v_event_key, 'post_id', NEW.id)
            );
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;