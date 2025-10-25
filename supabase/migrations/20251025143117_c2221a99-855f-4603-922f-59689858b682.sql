-- Create lead_history table to track all lead changes
CREATE TABLE IF NOT EXISTS public.lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'created', 'status_changed', 'edited', 'assigned', 'priority_changed'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Agency members can view lead history"
  ON public.lead_history
  FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "System can insert lead history"
  ON public.lead_history
  FOR INSERT
  WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_lead_history_lead_id ON public.lead_history(lead_id);
CREATE INDEX idx_lead_history_created_at ON public.lead_history(created_at DESC);

-- Function to track lead changes
CREATE OR REPLACE FUNCTION track_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.lead_history (
      lead_id,
      agency_id,
      user_id,
      action_type,
      description
    ) VALUES (
      NEW.id,
      NEW.agency_id,
      COALESCE(v_user_id, NEW.created_by),
      'created',
      'Lead criado'
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Track status changes
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      INSERT INTO public.lead_history (
        lead_id,
        agency_id,
        user_id,
        action_type,
        field_name,
        old_value,
        new_value,
        description
      ) VALUES (
        NEW.id,
        NEW.agency_id,
        COALESCE(v_user_id, NEW.created_by),
        'status_changed',
        'status',
        OLD.status,
        NEW.status,
        'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"'
      );
    END IF;
    
    -- Track priority changes
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
      INSERT INTO public.lead_history (
        lead_id,
        agency_id,
        user_id,
        action_type,
        field_name,
        old_value,
        new_value,
        description
      ) VALUES (
        NEW.id,
        NEW.agency_id,
        COALESCE(v_user_id, NEW.created_by),
        'priority_changed',
        'priority',
        OLD.priority,
        NEW.priority,
        'Prioridade alterada de "' || OLD.priority || '" para "' || NEW.priority || '"'
      );
    END IF;
    
    -- Track assignment changes
    IF (OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
      INSERT INTO public.lead_history (
        lead_id,
        agency_id,
        user_id,
        action_type,
        field_name,
        old_value,
        new_value,
        description
      ) VALUES (
        NEW.id,
        NEW.agency_id,
        COALESCE(v_user_id, NEW.created_by),
        'assigned',
        'assigned_to',
        COALESCE(OLD.assigned_to::TEXT, ''),
        COALESCE(NEW.assigned_to::TEXT, ''),
        CASE 
          WHEN NEW.assigned_to IS NULL THEN 'Atribuição removida'
          WHEN OLD.assigned_to IS NULL THEN 'Lead atribuído'
          ELSE 'Lead reatribuído'
        END
      );
    END IF;
    
    -- Track other field changes
    IF (OLD.name IS DISTINCT FROM NEW.name OR 
        OLD.email IS DISTINCT FROM NEW.email OR 
        OLD.phone IS DISTINCT FROM NEW.phone OR
        OLD.company IS DISTINCT FROM NEW.company OR
        OLD.value IS DISTINCT FROM NEW.value) THEN
      INSERT INTO public.lead_history (
        lead_id,
        agency_id,
        user_id,
        action_type,
        description
      ) VALUES (
        NEW.id,
        NEW.agency_id,
        COALESCE(v_user_id, NEW.created_by),
        'edited',
        'Informações do lead atualizadas'
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS track_lead_changes_trigger ON public.leads;
CREATE TRIGGER track_lead_changes_trigger
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_changes();