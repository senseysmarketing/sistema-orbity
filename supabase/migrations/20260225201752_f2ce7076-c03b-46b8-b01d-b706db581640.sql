
-- Add loss_reason and status_changed_at columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason text DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now();

-- Update trigger to also set status_changed_at when status changes
CREATE OR REPLACE FUNCTION public.set_lead_won_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se status mudou, atualizar status_changed_at
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at := NOW();
  END IF;

  -- Se status mudou para 'won' e won_at ainda não está definido
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NOW();
  END IF;
  
  -- Se status saiu de 'won', limpar won_at
  IF OLD.status = 'won' AND NEW.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NULL;
  END IF;

  -- Se status saiu de 'lost', limpar loss_reason
  IF OLD.status = 'lost' AND NEW.status IS DISTINCT FROM 'lost' THEN
    NEW.loss_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;
