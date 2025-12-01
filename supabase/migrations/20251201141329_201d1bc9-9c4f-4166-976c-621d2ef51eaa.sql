-- Correção do fechamento mensal: Limpar dados de janeiro 2026 e gerar dados corretos para dezembro 2025

-- 1. DELETAR PAGAMENTOS INCORRETOS DE JANEIRO 2026
-- (Gerados em 01/12/2025 com due_date em janeiro 2026)
DELETE FROM client_payments
WHERE due_date >= '2026-01-01' 
  AND due_date < '2026-02-01'
  AND created_at >= '2025-12-01'
  AND created_at < '2025-12-02';

-- 2. DELETAR DESPESAS RECORRENTES INCORRETAS DE JANEIRO 2026
-- (Geradas em 01/12/2025 com due_date em janeiro 2026)
DELETE FROM expenses
WHERE expense_type = 'recorrente'
  AND due_date >= '2026-01-01'
  AND due_date < '2026-02-01'
  AND created_at >= '2025-12-01'
  AND created_at < '2025-12-02';

-- 3. DELETAR SALÁRIOS INCORRETOS DE JANEIRO 2026 (se houver)
DELETE FROM salaries
WHERE due_date >= '2026-01-01'
  AND due_date < '2026-02-01'
  AND created_at >= '2025-12-01'
  AND created_at < '2025-12-02';

-- 4. GERAR PAGAMENTOS DE CLIENTES PARA DEZEMBRO 2025
INSERT INTO client_payments (client_id, agency_id, amount, due_date, status)
SELECT 
  c.id,
  c.agency_id,
  c.monthly_value,
  make_date(2025, 12, COALESCE(c.due_date, 10)) as due_date,
  'pending' as status
FROM clients c
WHERE c.active = true
  AND c.monthly_value > 0
  AND NOT EXISTS (
    SELECT 1 FROM client_payments cp
    WHERE cp.client_id = c.id
      AND cp.due_date >= '2025-12-01'
      AND cp.due_date < '2026-01-01'
  );

-- 5. GERAR DESPESAS RECORRENTES PARA DEZEMBRO 2025
INSERT INTO expenses (agency_id, name, amount, due_date, status, expense_type, category, description, recurrence_day)
SELECT 
  e.agency_id,
  e.name,
  e.amount,
  make_date(2025, 12, COALESCE(e.recurrence_day, extract(day from e.due_date)::int)) as due_date,
  'pending' as status,
  'recorrente' as expense_type,
  e.category,
  e.description,
  COALESCE(e.recurrence_day, extract(day from e.due_date)::int) as recurrence_day
FROM expenses e
WHERE e.expense_type = 'recorrente'
  AND e.parent_expense_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM expenses e2
    WHERE e2.name = e.name
      AND e2.agency_id = e.agency_id
      AND e2.expense_type = 'recorrente'
      AND e2.due_date >= '2025-12-01'
      AND e2.due_date < '2026-01-01'
  );

-- 6. GERAR SALÁRIOS PARA DEZEMBRO 2025 (baseado em novembro 2025)
INSERT INTO salaries (agency_id, employee_name, amount, due_date, status)
SELECT 
  s.agency_id,
  s.employee_name,
  s.amount,
  '2025-12-05' as due_date,
  'pending' as status
FROM salaries s
WHERE s.due_date >= '2025-11-01'
  AND s.due_date < '2025-12-01'
  AND NOT EXISTS (
    SELECT 1 FROM salaries s2
    WHERE s2.employee_name = s.employee_name
      AND s2.agency_id = s.agency_id
      AND s2.due_date >= '2025-12-01'
      AND s2.due_date < '2026-01-01'
  );

-- 7. REGISTRAR O FECHAMENTO MENSAL DE DEZEMBRO 2025 (se ainda não foi registrado)
INSERT INTO monthly_closures (
  agency_id, 
  closure_month, 
  payments_generated, 
  recurring_expenses_generated,
  installments_generated,
  salaries_generated,
  execution_details
)
SELECT 
  a.id,
  '2025-12-01'::date,
  (SELECT COUNT(*) FROM client_payments WHERE agency_id = a.id AND due_date >= '2025-12-01' AND due_date < '2026-01-01'),
  (SELECT COUNT(*) FROM expenses WHERE agency_id = a.id AND expense_type = 'recorrente' AND due_date >= '2025-12-01' AND due_date < '2026-01-01'),
  0,
  (SELECT COUNT(*) FROM salaries WHERE agency_id = a.id AND due_date >= '2025-12-01' AND due_date < '2026-01-01'),
  '{}'::jsonb
FROM agencies a
WHERE a.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM monthly_closures mc
    WHERE mc.agency_id = a.id
      AND mc.closure_month = '2025-12-01'
  );