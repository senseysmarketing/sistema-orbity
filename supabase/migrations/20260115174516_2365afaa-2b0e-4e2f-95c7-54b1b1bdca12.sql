-- Corrigir trigger notify_new_lead: mudar tipo de 'lead_new' para 'lead' (valor válido do enum)
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    agency_id,
    title,
    message,
    type,
    priority,
    metadata
  ) VALUES (
    NEW.created_by,
    NEW.agency_id,
    'Nova Lead Capturada',
    'Uma nova lead foi adicionada: ' || NEW.name,
    'lead',
    CASE 
      WHEN NEW.temperature = 'hot' THEN 'high'
      WHEN NEW.temperature = 'warm' THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'lead_id', NEW.id,
      'lead_name', NEW.name,
      'source', NEW.source,
      'temperature', NEW.temperature,
      'status', NEW.status
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;