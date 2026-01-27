-- Remove the pending_approval event from the notify_post_update_events trigger
-- The post.status_changed event already covers status changes including "pending_approval"

CREATE OR REPLACE FUNCTION public.notify_post_update_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_key TEXT;
  v_notify_data JSONB;
  v_recipient_id UUID;
  v_recipients UUID[];
  v_post_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_changed_fields JSONB;
  v_client_name TEXT;
  v_updater_name TEXT;
  v_post_clients JSONB;
BEGIN
  -- Get post title
  v_post_title := COALESCE(NEW.title, 'Post sem título');
  
  -- Get updater name (for UPDATE operations)
  IF TG_OP = 'UPDATE' AND NEW.updated_by IS NOT NULL THEN
    SELECT full_name INTO v_updater_name
    FROM profiles
    WHERE user_id = NEW.updated_by;
    v_updater_name := COALESCE(v_updater_name, 'Alguém');
  END IF;
  
  -- Get client names for multi-client posts
  IF NEW.client_ids IS NOT NULL AND array_length(NEW.client_ids, 1) > 0 THEN
    SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name))
    INTO v_post_clients
    FROM clients c
    WHERE c.id = ANY(NEW.client_ids);
    
    -- Get first client name for display
    SELECT name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_ids[1];
  END IF;
  
  -- Track old/new status for status change events
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_new_status := NEW.status;

  -- ===== STATUS CHANGE EVENT =====
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_key := 'post.status_changed';
    
    -- Get assigned users as recipients
    SELECT ARRAY_AGG(user_id) INTO v_recipients
    FROM post_assignments
    WHERE post_id = NEW.id;
    
    -- Also include who created the post if different from updater
    IF NEW.created_by IS NOT NULL AND NEW.created_by <> NEW.updated_by THEN
      IF v_recipients IS NULL THEN
        v_recipients := ARRAY[NEW.created_by];
      ELSIF NOT (NEW.created_by = ANY(v_recipients)) THEN
        v_recipients := array_append(v_recipients, NEW.created_by);
      END IF;
    END IF;
    
    -- Build notification data
    v_notify_data := jsonb_build_object(
      'post_id', NEW.id,
      'post_title', v_post_title,
      'client_name', v_client_name,
      'clients', v_post_clients,
      'old_status', v_old_status,
      'new_status', v_new_status,
      'updated_by', NEW.updated_by,
      'updated_by_name', v_updater_name
    );
    
    -- Insert notification for each recipient
    IF v_recipients IS NOT NULL THEN
      FOREACH v_recipient_id IN ARRAY v_recipients LOOP
        IF v_recipient_id <> NEW.updated_by THEN
          IF should_notify_user_for_event(v_recipient_id, NEW.agency_id, v_event_key, 'posts_enabled') THEN
            INSERT INTO notifications (
              agency_id,
              user_id,
              type,
              title,
              message,
              reference_type,
              reference_id,
              data
            ) VALUES (
              NEW.agency_id,
              v_recipient_id,
              'post',
              'Status alterado: ' || v_post_title,
              v_updater_name || ' alterou o status de "' || COALESCE(v_old_status, 'nenhum') || '" para "' || v_new_status || '"',
              'post',
              NEW.id,
              v_notify_data
            );
          END IF;
        END IF;
      END LOOP;
    END IF;
    
    -- Apply agency rules for published posts (notify admins)
    IF v_new_status = 'published' THEN
      PERFORM apply_agency_rules(
        NEW.agency_id,
        'post.published',
        NEW.id,
        'post',
        'Post publicado: ' || v_post_title,
        COALESCE(v_client_name, 'Cliente') || ' - Post foi publicado',
        v_notify_data,
        NEW.updated_by
      );
    END IF;
  END IF;

  -- ===== IMPORTANT FIELDS UPDATED EVENT =====
  IF TG_OP = 'UPDATE' THEN
    v_changed_fields := '{}'::jsonb;
    
    -- Check which important fields changed
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF NEW.scheduled_for IS DISTINCT FROM OLD.scheduled_for THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('scheduled_for', jsonb_build_object('old', OLD.scheduled_for, 'new', NEW.scheduled_for));
    END IF;
    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    IF NEW.notes IS DISTINCT FROM OLD.notes AND (
      (OLD.notes IS NULL AND NEW.notes IS NOT NULL) OR
      (OLD.notes IS NOT NULL AND NEW.notes IS NULL) OR
      (OLD.notes IS NOT NULL AND NEW.notes IS NOT NULL AND length(NEW.notes) - length(OLD.notes) > 50)
    ) THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('notes', jsonb_build_object('changed', true));
    END IF;
    
    -- Only fire event if important fields changed (and not just status change)
    IF v_changed_fields <> '{}'::jsonb AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      v_event_key := 'post.updated_important';
      
      -- Get assigned users as recipients
      SELECT ARRAY_AGG(user_id) INTO v_recipients
      FROM post_assignments
      WHERE post_id = NEW.id;
      
      -- Build notification data
      v_notify_data := jsonb_build_object(
        'post_id', NEW.id,
        'post_title', v_post_title,
        'client_name', v_client_name,
        'clients', v_post_clients,
        'changed_fields', v_changed_fields,
        'updated_by', NEW.updated_by,
        'updated_by_name', v_updater_name
      );
      
      -- Insert notification for each recipient
      IF v_recipients IS NOT NULL THEN
        FOREACH v_recipient_id IN ARRAY v_recipients LOOP
          IF v_recipient_id <> NEW.updated_by THEN
            IF should_notify_user_for_event(v_recipient_id, NEW.agency_id, v_event_key, 'posts_enabled') THEN
              INSERT INTO notifications (
                agency_id,
                user_id,
                type,
                title,
                message,
                reference_type,
                reference_id,
                data
              ) VALUES (
                NEW.agency_id,
                v_recipient_id,
                'post',
                'Post atualizado: ' || v_post_title,
                v_updater_name || ' fez alterações importantes no post',
                'post',
                NEW.id,
                v_notify_data
              );
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;