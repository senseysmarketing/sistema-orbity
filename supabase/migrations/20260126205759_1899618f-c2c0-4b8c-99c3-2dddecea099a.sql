-- Habilitar extensão pg_net para chamadas HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Função que dispara push notification via edge function
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Obter as configurações do Supabase
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Fallback para URL hardcoded se setting não existir
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := 'https://ovookkywclrqfmtumelw.supabase.co';
  END IF;
  
  -- Chamar edge function send-push-notification via pg_net
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
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
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )::text
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger AFTER INSERT na tabela notifications
DROP TRIGGER IF EXISTS trg_push_on_new_notification ON public.notifications;

CREATE TRIGGER trg_push_on_new_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.trigger_push_on_notification();

-- Comentário para documentação
COMMENT ON FUNCTION public.trigger_push_on_notification() IS 
'Dispara push notification via edge function sempre que uma notificação é inserida no banco';