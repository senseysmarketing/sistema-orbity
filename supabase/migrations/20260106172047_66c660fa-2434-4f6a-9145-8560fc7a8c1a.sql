-- Parte 1: Criar tabela de funcionários (mestres de salário)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  role TEXT,
  payment_day INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view employees from their agency"
ON public.employees FOR SELECT
USING (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert employees in their agency"
ON public.employees FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update employees in their agency"
ON public.employees FOR UPDATE
USING (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete employees in their agency"
ON public.employees FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
  )
);

-- Parte 2: Adicionar employee_id na tabela salaries
ALTER TABLE public.salaries ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Parte 3: Migrar dados existentes - criar funcionários únicos
INSERT INTO public.employees (agency_id, name, base_salary, is_active, payment_day)
SELECT DISTINCT ON (agency_id, employee_name)
  agency_id,
  employee_name,
  amount,
  true,
  5
FROM public.salaries
WHERE agency_id IS NOT NULL AND employee_name IS NOT NULL
ORDER BY agency_id, employee_name, created_at DESC;

-- Parte 4: Vincular salários existentes aos funcionários criados
UPDATE public.salaries s
SET employee_id = e.id
FROM public.employees e
WHERE s.agency_id = e.agency_id AND s.employee_name = e.name;

-- Parte 5: Gerar salários de janeiro/2026 para funcionários ativos
INSERT INTO public.salaries (agency_id, employee_id, employee_name, amount, due_date, status)
SELECT 
  e.agency_id,
  e.id,
  e.name,
  e.base_salary,
  ('2026-01-' || LPAD(e.payment_day::text, 2, '0'))::date,
  'pending'
FROM public.employees e
WHERE e.is_active = true
AND NOT EXISTS (
  SELECT 1 FROM public.salaries s 
  WHERE s.employee_id = e.id 
  AND s.due_date >= '2026-01-01' 
  AND s.due_date < '2026-02-01'
);

-- Trigger para updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();