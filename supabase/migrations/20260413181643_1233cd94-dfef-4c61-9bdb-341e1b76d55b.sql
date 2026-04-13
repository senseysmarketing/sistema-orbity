-- 1. Fix orphan data: fill won_at for existing won leads missing it
UPDATE public.leads 
SET won_at = COALESCE(status_changed_at, updated_at, NOW()) 
WHERE status = 'won' AND won_at IS NULL;

-- 2. Update function to handle INSERT (OLD is NULL on insert)
CREATE OR REPLACE FUNCTION public.set_lead_won_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se status mudou, atualizar status_changed_at
  IF OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at := NOW();
  END IF;

  -- Se status é 'won' e (é INSERT ou mudou para 'won')
  IF NEW.status = 'won' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'won') THEN
    NEW.won_at := NOW();
  END IF;
  
  -- Se status saiu de 'won', limpar won_at
  IF OLD IS NOT NULL AND OLD.status = 'won' AND NEW.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NULL;
  END IF;

  -- Se status saiu de 'lost', limpar loss_reason
  IF OLD IS NOT NULL AND OLD.status = 'lost' AND NEW.status IS DISTINCT FROM 'lost' THEN
    NEW.loss_reason := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Recreate trigger to cover INSERT + UPDATE
DROP TRIGGER IF EXISTS set_lead_won_at_trigger ON public.leads;
CREATE TRIGGER set_lead_won_at_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_lead_won_at();