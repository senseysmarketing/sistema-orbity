-- Corrigir função trigger_push_on_notification para usar net.http_post() corretamente
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
BEGIN
  -- Chamar edge function send-push-notification via pg_net
  PERFORM net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'type', NEW.type,
        'action_url', COALESCE(NEW.action_url, '/dashboard'),
        'notification_id', NEW.id::text,
        'play_sound', COALESCE((NEW.metadata->>'play_sound')::text, 'false')
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 5000
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;