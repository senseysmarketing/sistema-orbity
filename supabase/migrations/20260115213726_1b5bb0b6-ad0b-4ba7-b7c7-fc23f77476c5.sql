-- Corrigir função track_lead_changes: 
-- 1. Adicionar action_type (campo obrigatório)
-- 2. Ignorar INSERT (apenas rastrear UPDATE)
-- 3. Usar COALESCE para user_id
CREATE OR REPLACE FUNCTION public.track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Ignorar INSERT - apenas rastrear alterações (UPDATE)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Track status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      user_id,
      action_type,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      COALESCE(NEW.created_by, OLD.created_by),
      'status_changed',
      'status',
      OLD.status,
      NEW.status
    );
  END IF;
  
  -- Track temperature changes
  IF (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      user_id,
      action_type,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      COALESCE(NEW.created_by, OLD.created_by),
      'edited',
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
      user_id,
      action_type,
      field_name,
      old_value,
      new_value
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      COALESCE(NEW.created_by, OLD.created_by),
      'edited',
      'value',
      OLD.value::text,
      NEW.value::text
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;