-- Fix notify_post_update_events function to use correct column names
-- Problem: Function was referencing non-existent columns (updated_by, client_ids, scheduled_for)

CREATE OR REPLACE FUNCTION public.notify_post_update_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_key TEXT;
  v_recipients UUID[];
  v_post_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_client_name TEXT;
  v_recipient_id UUID;
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
    
    -- Notify recipients
    IF v_recipients IS NOT NULL THEN
      FOREACH v_recipient_id IN ARRAY v_recipients LOOP
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
$$;