-- Gerar salários de janeiro/2026 para todos os funcionários ativos que ainda não têm salário no mês
INSERT INTO salaries (agency_id, employee_id, employee_name, amount, due_date, status)
SELECT 
  e.agency_id,
  e.id,
  e.name,
  e.base_salary,
  make_date(2026, 1, e.payment_day),
  'pending'
FROM employees e
WHERE e.is_active = true
  AND e.agency_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM salaries s 
    WHERE s.employee_id = e.id 
    AND s.due_date >= '2026-01-01' 
    AND s.due_date <= '2026-01-31'
  );