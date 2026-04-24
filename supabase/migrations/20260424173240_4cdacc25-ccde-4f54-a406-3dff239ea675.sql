-- RPC para detalhes consolidados de uma agência (Painel Master)
CREATE OR REPLACE FUNCTION public.master_get_agency_details(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency jsonb;
  v_subscription jsonb;
  v_members jsonb;
  v_billing jsonb;
  v_activity jsonb;
  v_last_activity timestamptz;
  v_last_login timestamptz;
BEGIN
  -- Apenas master agency admin pode acessar
  IF NOT public.is_master_agency_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Dados da agência (cadastro + contato)
  SELECT to_jsonb(a) INTO v_agency
  FROM (
    SELECT
      id, name, slug, contact_email, contact_phone, public_email, public_phone,
      website_url, description, logo_url, brand_theme, is_active,
      created_at, updated_at, onboarding_completed_at,
      max_users, max_clients, max_leads, max_tasks, monthly_value
    FROM public.agencies
    WHERE id = p_agency_id
  ) a;

  IF v_agency IS NULL THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Assinatura + plano
  SELECT to_jsonb(s) INTO v_subscription
  FROM (
    SELECT
      sub.id, sub.status, sub.billing_cycle, sub.trial_start, sub.trial_end,
      sub.current_period_start, sub.current_period_end, sub.next_payment_date,
      sub.last_payment_date, sub.canceled_at, sub.auto_renew,
      sub.stripe_customer_id, sub.stripe_subscription_id,
      p.name as plan_name, p.slug as plan_slug,
      p.price_monthly, p.price_yearly
    FROM public.agency_subscriptions sub
    LEFT JOIN public.subscription_plans p ON p.id = sub.plan_id
    WHERE sub.agency_id = p_agency_id
  ) s;

  -- Membros com último login (auth.users.last_sign_in_at)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', au.user_id,
    'role', au.role,
    'custom_role', au.custom_role,
    'joined_at', au.joined_at,
    'name', p.name,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'last_sign_in_at', u.last_sign_in_at,
    'created_at', u.created_at
  ) ORDER BY au.joined_at), '[]'::jsonb) INTO v_members
  FROM public.agency_users au
  LEFT JOIN public.profiles p ON p.user_id = au.user_id
  LEFT JOIN auth.users u ON u.id = au.user_id
  WHERE au.agency_id = p_agency_id;

  -- Histórico de faturas (últimas 12)
  SELECT COALESCE(jsonb_agg(b ORDER BY b.created_at DESC), '[]'::jsonb) INTO v_billing
  FROM (
    SELECT id, amount, currency, status, due_date, paid_date,
           billing_period_start, billing_period_end, invoice_url,
           stripe_invoice_id, created_at
    FROM public.billing_history
    WHERE agency_id = p_agency_id
    ORDER BY created_at DESC
    LIMIT 12
  ) b;

  -- Último login (qualquer membro)
  SELECT MAX(u.last_sign_in_at) INTO v_last_login
  FROM public.agency_users au
  JOIN auth.users u ON u.id = au.user_id
  WHERE au.agency_id = p_agency_id;

  -- Última atividade (criação de qualquer entidade)
  SELECT MAX(ts) INTO v_last_activity FROM (
    SELECT MAX(created_at) ts FROM public.tasks WHERE agency_id = p_agency_id
    UNION ALL SELECT MAX(created_at) FROM public.leads WHERE agency_id = p_agency_id
    UNION ALL SELECT MAX(created_at) FROM public.meetings WHERE agency_id = p_agency_id
    UNION ALL SELECT MAX(created_at) FROM public.clients WHERE agency_id = p_agency_id
    UNION ALL SELECT MAX(created_at) FROM public.client_payments WHERE agency_id = p_agency_id
  ) x;

  -- Métricas de uso e atividade recente
  SELECT jsonb_build_object(
    'total_clients', (SELECT COUNT(*) FROM public.clients WHERE agency_id = p_agency_id),
    'active_clients', (SELECT COUNT(*) FROM public.clients WHERE agency_id = p_agency_id AND active = true),
    'total_leads', (SELECT COUNT(*) FROM public.leads WHERE agency_id = p_agency_id),
    'leads_last_7d', (SELECT COUNT(*) FROM public.leads WHERE agency_id = p_agency_id AND created_at > now() - interval '7 days'),
    'leads_last_30d', (SELECT COUNT(*) FROM public.leads WHERE agency_id = p_agency_id AND created_at > now() - interval '30 days'),
    'total_tasks', (SELECT COUNT(*) FROM public.tasks WHERE agency_id = p_agency_id),
    'tasks_last_7d', (SELECT COUNT(*) FROM public.tasks WHERE agency_id = p_agency_id AND created_at > now() - interval '7 days'),
    'tasks_completed_30d', (SELECT COUNT(*) FROM public.tasks WHERE agency_id = p_agency_id AND status = 'completed' AND updated_at > now() - interval '30 days'),
    'total_meetings', (SELECT COUNT(*) FROM public.meetings WHERE agency_id = p_agency_id),
    'meetings_last_30d', (SELECT COUNT(*) FROM public.meetings WHERE agency_id = p_agency_id AND created_at > now() - interval '30 days'),
    'total_payments', (SELECT COUNT(*) FROM public.client_payments WHERE agency_id = p_agency_id),
    'payments_paid_30d', (SELECT COUNT(*) FROM public.client_payments WHERE agency_id = p_agency_id AND status = 'paid' AND paid_at > now() - interval '30 days'),
    'revenue_30d', (SELECT COALESCE(SUM(COALESCE(amount_paid, amount)), 0) FROM public.client_payments WHERE agency_id = p_agency_id AND status = 'paid' AND paid_at > now() - interval '30 days'),
    'last_login_at', v_last_login,
    'last_activity_at', v_last_activity
  ) INTO v_activity;

  RETURN jsonb_build_object(
    'agency', v_agency,
    'subscription', v_subscription,
    'members', v_members,
    'billing_history', v_billing,
    'activity', v_activity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.master_get_agency_details(uuid) TO authenticated;