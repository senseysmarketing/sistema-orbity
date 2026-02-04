-- Adicionar coluna won_at para registrar data de fechamento da venda
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS won_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para consultas por período de vendas
CREATE INDEX IF NOT EXISTS idx_leads_won_at 
ON public.leads (won_at) 
WHERE won_at IS NOT NULL;

-- Trigger para atualizar won_at automaticamente
CREATE OR REPLACE FUNCTION public.set_lead_won_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para 'won' e won_at ainda não está definido
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NOW();
  END IF;
  
  -- Se status saiu de 'won', limpar won_at
  IF OLD.status = 'won' AND NEW.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS set_lead_won_at_trigger ON public.leads;
CREATE TRIGGER set_lead_won_at_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lead_won_at();

-- Retroativamente preencher won_at para leads já ganhos (usando updated_at como aproximação)
UPDATE public.leads 
SET won_at = updated_at 
WHERE status = 'won' AND won_at IS NULL;