-- Notifications by event for Social Media Posts

-- 1) Apply agency-level post rules (admins, etc.)
CREATE OR REPLACE FUNCTION public.apply_post_event_rules(
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
  post_title text;
  post_id uuid;
BEGIN
  post_id := (p_payload->>'post_id')::uuid;

  IF post_id IS NOT NULL THEN
    SELECT title INTO post_title
    FROM public.social_media_posts
    WHERE id = post_id
    LIMIT 1;
  END IF;

  FOR r IN
    SELECT *
    FROM public.agency_notification_rules
    WHERE agency_id = p_agency_id
      AND event_key = p_event_key
      AND enabled = true
  LOOP
    -- Optional condition matcher: conditions.to
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
        IF public.should_notify_user_for_event(admin_user.user_id, p_agency_id, 'posts', p_event_key) THEN
          INSERT INTO public.notifications (
            user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
          ) VALUES (
            admin_user.user_id,
            p_agency_id,
            'post',
            'medium',
            '📣 Alerta do time (Posts)',
            COALESCE(post_title, 'Post'),
            '/dashboard/social-media',
            'Ver post',
            jsonb_build_object('event', p_event_key, 'post_id', post_id, 'audience', 'admins', 'rule_id', r.id)
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

-- 2) Notify post assignment (post.assigned)
CREATE OR REPLACE FUNCTION public.notify_post_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- (Default strategy chosen: Responsáveis + criador)
  -- Notify creator when assigned (agency-level rule: creator). We implement as a rule to keep parity with tasks.
  IF p.created_by IS NOT NULL THEN
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
$$;

-- 3) Notify post update events (status + important + pending_approval + published rule)
CREATE OR REPLACE FUNCTION public.notify_post_update_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_id uuid := NEW.agency_id;
  v_status_changed boolean := (OLD.status IS DISTINCT FROM NEW.status);
  v_important_changed boolean := (
    OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date OR
    OLD.priority IS DISTINCT FROM NEW.priority OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.notes IS DISTINCT FROM NEW.notes
  );
  assignee record;
  v_event_key text;
BEGIN
  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Status changed
  IF v_status_changed THEN
    v_event_key := 'post.status_changed';

    FOR assignee IN
      SELECT user_id FROM public.post_assignments WHERE post_id = NEW.id
    LOOP
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          assignee.user_id,
          v_agency_id,
          'post',
          'medium',
          '🔄 Status do post atualizado',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id, 'from', OLD.status, 'to', NEW.status)
        );
      END IF;
    END LOOP;

    -- Also notify creator (default strategy)
    IF NEW.created_by IS NOT NULL THEN
      IF public.should_notify_user_for_event(NEW.created_by, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          NEW.created_by,
          v_agency_id,
          'post',
          'low',
          '🔄 Status do post atualizado',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id, 'from', OLD.status, 'to', NEW.status, 'audience', 'creator')
        );
      END IF;
    END IF;

    -- When post is published, apply agency rule (admins)
    IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
      PERFORM public.apply_post_event_rules(v_agency_id, 'post.published', jsonb_build_object('post_id', NEW.id, 'from', OLD.status, 'to', NEW.status));
    END IF;
  END IF;

  -- Pending approval event
  IF NEW.status = 'pending_approval' AND OLD.status IS DISTINCT FROM 'pending_approval' THEN
    v_event_key := 'post.pending_approval';

    FOR assignee IN
      SELECT user_id FROM public.post_assignments WHERE post_id = NEW.id
    LOOP
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          assignee.user_id,
          v_agency_id,
          'post',
          'medium',
          '⏳ Post aguardando aprovação',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id, 'from', OLD.status, 'to', NEW.status)
        );
      END IF;
    END LOOP;

    IF NEW.created_by IS NOT NULL THEN
      IF public.should_notify_user_for_event(NEW.created_by, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          NEW.created_by,
          v_agency_id,
          'post',
          'low',
          '⏳ Post aguardando aprovação',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id, 'from', OLD.status, 'to', NEW.status, 'audience', 'creator')
        );
      END IF;
    END IF;
  END IF;

  -- Important updates
  IF v_important_changed THEN
    v_event_key := 'post.updated_important';

    FOR assignee IN
      SELECT user_id FROM public.post_assignments WHERE post_id = NEW.id
    LOOP
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          assignee.user_id,
          v_agency_id,
          'post',
          'low',
          '✏️ Post atualizado',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id)
        );
      END IF;
    END LOOP;

    IF NEW.created_by IS NOT NULL THEN
      IF public.should_notify_user_for_event(NEW.created_by, v_agency_id, 'posts', v_event_key) THEN
        INSERT INTO public.notifications (
          user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
        ) VALUES (
          NEW.created_by,
          v_agency_id,
          'post',
          'low',
          '✏️ Post atualizado',
          COALESCE(NEW.title, 'Post'),
          '/dashboard/social-media',
          'Ver post',
          jsonb_build_object('event', v_event_key, 'post_id', NEW.id, 'audience', 'creator')
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Triggers
DROP TRIGGER IF EXISTS trg_notify_post_assignment ON public.post_assignments;
CREATE TRIGGER trg_notify_post_assignment
AFTER INSERT ON public.post_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_assignment();

DROP TRIGGER IF EXISTS trg_notify_post_update_events ON public.social_media_posts;
CREATE TRIGGER trg_notify_post_update_events
AFTER UPDATE ON public.social_media_posts
FOR EACH ROW
EXECUTE FUNCTION public.notify_post_update_events();
