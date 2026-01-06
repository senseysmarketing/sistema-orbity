-- Adicionar coluna is_active para controlar despesas recorrentes
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índice para otimizar consultas de despesas recorrentes ativas
CREATE INDEX IF NOT EXISTS idx_expenses_recurring_active 
ON public.expenses (agency_id, expense_type, is_active, parent_expense_id) 
WHERE expense_type = 'recorrente';

-- Atualizar despesas existentes: definir parent_expense_id para despesas geradas
-- Identificar despesas mestras (as mais antigas de cada nome/agency) e vincular as demais
WITH master_expenses AS (
  SELECT DISTINCT ON (agency_id, name)
    id,
    agency_id,
    name
  FROM public.expenses
  WHERE expense_type = 'recorrente'
    AND parent_expense_id IS NULL
  ORDER BY agency_id, name, created_at ASC
),
child_expenses AS (
  SELECT e.id, m.id as master_id
  FROM public.expenses e
  JOIN master_expenses m ON e.agency_id = m.agency_id AND e.name = m.name AND e.id != m.id
  WHERE e.expense_type = 'recorrente'
    AND e.parent_expense_id IS NULL
)
UPDATE public.expenses
SET parent_expense_id = child_expenses.master_id
FROM child_expenses
WHERE public.expenses.id = child_expenses.id;

-- Comentário explicativo
COMMENT ON COLUMN public.expenses.is_active IS 'Controla se despesa recorrente continua gerando novas instâncias mensais. Apenas mestras (parent_expense_id IS NULL) usam este campo.';