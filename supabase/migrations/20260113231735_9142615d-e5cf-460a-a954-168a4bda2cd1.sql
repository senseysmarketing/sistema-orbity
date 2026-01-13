-- View para métricas mensais de agências
CREATE OR REPLACE VIEW public.master_monthly_metrics AS
SELECT 
  DATE_TRUNC('month', a.created_at)::date as month,
  COUNT(*)::int as new_agencies,
  COUNT(*) FILTER (WHERE asub.status = 'active')::int as converted_to_paid
FROM agencies a
LEFT JOIN agency_subscriptions asub ON a.id = asub.agency_id
WHERE public.is_master_agency_admin()
GROUP BY DATE_TRUNC('month', a.created_at)
ORDER BY month DESC
LIMIT 12;

-- View para métricas de uso por agência
CREATE OR REPLACE VIEW public.master_agency_usage AS
SELECT 
  a.id as agency_id,
  a.name as agency_name,
  mao.computed_status,
  mao.plan_name,
  COALESCE(t.task_count, 0)::int as task_count,
  COALESCE(p.post_count, 0)::int as post_count,
  COALESCE(u.user_count, 0)::int as user_count,
  a.created_at
FROM agencies a
LEFT JOIN master_agency_overview mao ON a.id = mao.agency_id
LEFT JOIN (
  SELECT agency_id, COUNT(*)::int as task_count 
  FROM tasks 
  GROUP BY agency_id
) t ON a.id = t.agency_id
LEFT JOIN (
  SELECT agency_id, COUNT(*)::int as post_count 
  FROM social_media_posts 
  GROUP BY agency_id
) p ON a.id = p.agency_id
LEFT JOIN (
  SELECT agency_id, COUNT(*)::int as user_count 
  FROM agency_users 
  GROUP BY agency_id
) u ON a.id = u.agency_id
WHERE public.is_master_agency_admin()
ORDER BY (COALESCE(t.task_count, 0) + COALESCE(p.post_count, 0)) DESC;

-- View para receita mensal
CREATE OR REPLACE VIEW public.master_monthly_revenue AS
SELECT 
  DATE_TRUNC('month', paid_date)::date as month,
  SUM(amount)::numeric as revenue,
  COUNT(*)::int as payment_count
FROM billing_history
WHERE status = 'paid' 
  AND paid_date IS NOT NULL
  AND public.is_master_agency_admin()
GROUP BY DATE_TRUNC('month', paid_date)
ORDER BY month DESC
LIMIT 12;