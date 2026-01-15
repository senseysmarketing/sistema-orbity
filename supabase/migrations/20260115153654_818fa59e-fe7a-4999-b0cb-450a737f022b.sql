-- Corrigir trigger notify_new_lead: mudar de priority para temperature
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir notificação para o criador da lead
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
    'lead_new',
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

-- Corrigir trigger track_lead_changes: mudar de priority para temperature
CREATE OR REPLACE FUNCTION public.track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      changed_by,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      NEW.created_by,
      'status',
      OLD.status,
      NEW.status
    );
  END IF;
  
  -- Track temperature changes (era priority)
  IF (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      changed_by,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      NEW.created_by,
      'temperature',
      OLD.temperature,
      NEW.temperature
    );
  END IF;
  
  -- Track value changes
  IF (OLD.value IS DISTINCT FROM NEW.value) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      changed_by,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      NEW.created_by,
      'value',
      OLD.value::text,
      NEW.value::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;