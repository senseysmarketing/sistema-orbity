-- Gerar salários de Janeiro 2025 para funcionários ativos
INSERT INTO salaries (agency_id, employee_id, employee_name, amount, due_date, status)
SELECT 
  agency_id,
  id,
  name,
  base_salary,
  make_date(2025, 1, payment_day),
  'pending'
FROM employees 
WHERE is_active = true
ON CONFLICT DO NOTHING;