-- Create function to notify agency users about new leads
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_user RECORD;
  v_creator_name TEXT;
BEGIN
  -- Get creator name
  SELECT name INTO v_creator_name
  FROM public.profiles
  WHERE user_id = NEW.created_by;

  -- Create notifications for all agency users (except the creator)
  FOR v_agency_user IN 
    SELECT DISTINCT au.user_id
    FROM public.agency_users au
    WHERE au.agency_id = NEW.agency_id
      AND au.user_id != NEW.created_by
  LOOP
    INSERT INTO public.notifications (
      user_id,
      agency_id,
      type,
      priority,
      title,
      message,
      action_url,
      action_label,
      metadata
    ) VALUES (
      v_agency_user.user_id,
      NEW.agency_id,
      'lead',
      CASE 
        WHEN NEW.priority = 'high' THEN 'high'
        WHEN NEW.priority = 'medium' THEN 'medium'
        ELSE 'low'
      END,
      '🎯 Nova Lead Recebida',
      CASE 
        WHEN NEW.source = 'facebook_leads' THEN 
          NEW.name || ' - Capturada via Facebook Lead Ads'
        ELSE 
          NEW.name || ' - Adicionada por ' || COALESCE(v_creator_name, 'um usuário')
      END,
      '/crm',
      'Ver lead',
      jsonb_build_object(
        'lead_id', NEW.id,
        'lead_name', NEW.name,
        'source', NEW.source,
        'priority', NEW.priority,
        'play_sound', true
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function when a new lead is inserted
DROP TRIGGER IF EXISTS on_lead_created ON public.leads;
CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_lead();