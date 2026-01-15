-- Corrigir função track_lead_changes: usar user_id em vez de changed_by
CREATE OR REPLACE FUNCTION public.track_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Track status changes
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      user_id,
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
  
  -- Track temperature changes
  IF (OLD.temperature IS DISTINCT FROM NEW.temperature) THEN
    INSERT INTO lead_history (
      lead_id,
      agency_id,
      user_id,
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
      user_id,
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