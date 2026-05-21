
-- ============================================================
-- Phase 1: Performance & PPR refactor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. bonus_periods: new columns
-- ----------------------------------------------------------------
ALTER TABLE public.bonus_periods
  ADD COLUMN IF NOT EXISTS calculation_status text NOT NULL DEFAULT 'not_calculated',
  ADD COLUMN IF NOT EXISTS calculation_error text,
  ADD COLUMN IF NOT EXISTS profit_target numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS profit_actual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ppr_percent numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS bonus_pool_mode text NOT NULL DEFAULT 'percent_of_profit',
  ADD COLUMN IF NOT EXISTS bonus_pool_manual_amount numeric,
  ADD COLUMN IF NOT EXISTS target_is_blocking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_by uuid,
  ADD COLUMN IF NOT EXISTS calculation_snapshot jsonb;

-- Copy legacy bonus_pool_percent into ppr_percent
UPDATE public.bonus_periods
SET ppr_percent = bonus_pool_percent
WHERE bonus_pool_percent IS NOT NULL AND ppr_percent = 10;

-- Normalize status values
UPDATE public.bonus_periods SET status = 'open'
WHERE status NOT IN ('open','closed');

ALTER TABLE public.bonus_periods
  DROP CONSTRAINT IF EXISTS bonus_periods_status_check;
ALTER TABLE public.bonus_periods
  ADD CONSTRAINT bonus_periods_status_check CHECK (status IN ('open','closed'));

ALTER TABLE public.bonus_periods
  DROP CONSTRAINT IF EXISTS bonus_periods_calculation_status_check;
ALTER TABLE public.bonus_periods
  ADD CONSTRAINT bonus_periods_calculation_status_check
  CHECK (calculation_status IN ('not_calculated','calculated','stale','error'));

ALTER TABLE public.bonus_periods
  DROP CONSTRAINT IF EXISTS bonus_periods_pool_mode_check;
ALTER TABLE public.bonus_periods
  ADD CONSTRAINT bonus_periods_pool_mode_check
  CHECK (bonus_pool_mode IN ('percent_of_profit','manual'));

-- ----------------------------------------------------------------
-- 2. ppr_period_months
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ppr_period_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.bonus_periods(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  month_start date NOT NULL,
  month_end date NOT NULL,
  revenue numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  salaries numeric NOT NULL DEFAULT 0,
  adjustments numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  bonus_pool numeric NOT NULL DEFAULT 0,
  source_snapshot jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, month_start)
);
CREATE INDEX IF NOT EXISTS ppr_period_months_agency_idx ON public.ppr_period_months(agency_id);

ALTER TABLE public.ppr_period_months ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppr_period_months_select" ON public.ppr_period_months;
CREATE POLICY "ppr_period_months_select" ON public.ppr_period_months
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
-- writes only via service role

-- ----------------------------------------------------------------
-- 3. ppr_financial_adjustments
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ppr_financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  period_id uuid REFERENCES public.bonus_periods(id) ON DELETE SET NULL,
  effective_date date NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('revenue_adjustment','expense_adjustment','salary_adjustment','other')),
  amount numeric NOT NULL,
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ppr_fin_adj_agency_date_idx ON public.ppr_financial_adjustments(agency_id, effective_date);

ALTER TABLE public.ppr_financial_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ppr_fin_adj_select" ON public.ppr_financial_adjustments;
CREATE POLICY "ppr_fin_adj_select" ON public.ppr_financial_adjustments
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

DROP POLICY IF EXISTS "ppr_fin_adj_insert" ON public.ppr_financial_adjustments;
CREATE POLICY "ppr_fin_adj_insert" ON public.ppr_financial_adjustments
  FOR INSERT WITH CHECK (
    public.is_agency_admin(agency_id)
    AND (
      period_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.bonus_periods p WHERE p.id = period_id AND p.status = 'closed')
    )
  );

DROP POLICY IF EXISTS "ppr_fin_adj_update" ON public.ppr_financial_adjustments;
CREATE POLICY "ppr_fin_adj_update" ON public.ppr_financial_adjustments
  FOR UPDATE USING (
    public.is_agency_admin(agency_id)
    AND (
      period_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.bonus_periods p WHERE p.id = period_id AND p.status = 'closed')
    )
  );

DROP POLICY IF EXISTS "ppr_fin_adj_delete" ON public.ppr_financial_adjustments;
CREATE POLICY "ppr_fin_adj_delete" ON public.ppr_financial_adjustments
  FOR DELETE USING (
    public.is_agency_admin(agency_id)
    AND (
      period_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.bonus_periods p WHERE p.id = period_id AND p.status = 'closed')
    )
  );

DROP TRIGGER IF EXISTS update_ppr_fin_adj_updated_at ON public.ppr_financial_adjustments;
CREATE TRIGGER update_ppr_fin_adj_updated_at
  BEFORE UPDATE ON public.ppr_financial_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- 4. ppr_employee_results
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ppr_employee_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.bonus_periods(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  eligibility_weight numeric NOT NULL DEFAULT 1,
  base_share numeric NOT NULL DEFAULT 0,
  score_final numeric NOT NULL DEFAULT 0,
  bonus_amount numeric NOT NULL DEFAULT 0,
  calculation_details jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, employee_id)
);
CREATE INDEX IF NOT EXISTS ppr_employee_results_agency_idx ON public.ppr_employee_results(agency_id);

ALTER TABLE public.ppr_employee_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppr_employee_results_select" ON public.ppr_employee_results;
CREATE POLICY "ppr_employee_results_select" ON public.ppr_employee_results
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
-- writes only via service role

-- ----------------------------------------------------------------
-- 5. ppr_calculation_logs
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ppr_calculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid REFERENCES public.bonus_periods(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ppr_calc_logs_period_idx ON public.ppr_calculation_logs(period_id, created_at DESC);

ALTER TABLE public.ppr_calculation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppr_calc_logs_select" ON public.ppr_calculation_logs;
CREATE POLICY "ppr_calc_logs_select" ON public.ppr_calculation_logs
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
-- writes only via service role

-- ----------------------------------------------------------------
-- 6. employee_scorecards: new columns + RLS update
-- ----------------------------------------------------------------
ALTER TABLE public.employee_scorecards
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewer_user_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS criteria_snapshot jsonb;

ALTER TABLE public.employee_scorecards
  DROP CONSTRAINT IF EXISTS employee_scorecards_status_check;
ALTER TABLE public.employee_scorecards
  ADD CONSTRAINT employee_scorecards_status_check
  CHECK (status IN ('draft','submitted','locked'));

-- ----------------------------------------------------------------
-- 7. employees.eligibility_weight
-- ----------------------------------------------------------------
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS eligibility_weight numeric NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------
-- 8. nps_tokens.period_id + unique
-- ----------------------------------------------------------------
ALTER TABLE public.nps_tokens
  ADD COLUMN IF NOT EXISTS period_id uuid REFERENCES public.bonus_periods(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS nps_tokens_unique_client_period
  ON public.nps_tokens(client_id, period_id) WHERE period_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 9. Stale trigger function + triggers
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_ppr_periods_stale_by_date(
  p_agency_id uuid, p_date date
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_agency_id IS NULL OR p_date IS NULL THEN RETURN; END IF;
  UPDATE public.bonus_periods
     SET calculation_status = 'stale'
   WHERE agency_id = p_agency_id
     AND status <> 'closed'
     AND calculation_status = 'calculated'
     AND p_date BETWEEN start_date AND end_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_stale_from_payment_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agency uuid;
  v_date date;
  v_old_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_agency := OLD.agency_id;
    v_date := COALESCE(OLD.paid_at::date, OLD.paid_date);
    IF v_date IS NOT NULL THEN
      PERFORM public.mark_ppr_periods_stale_by_date(v_agency, v_date);
    END IF;
    RETURN OLD;
  END IF;

  v_agency := NEW.agency_id;
  v_date := COALESCE(NEW.paid_at::date, NEW.paid_date);
  IF v_date IS NOT NULL THEN
    PERFORM public.mark_ppr_periods_stale_by_date(v_agency, v_date);
  END IF;
  IF TG_OP = 'UPDATE' THEN
    v_old_date := COALESCE(OLD.paid_at::date, OLD.paid_date);
    IF v_old_date IS NOT NULL AND v_old_date IS DISTINCT FROM v_date THEN
      PERFORM public.mark_ppr_periods_stale_by_date(OLD.agency_id, v_old_date);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ppr_stale_client_payments ON public.client_payments;
CREATE TRIGGER trg_ppr_stale_client_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_stale_from_payment_like();

DROP TRIGGER IF EXISTS trg_ppr_stale_expenses ON public.expenses;
CREATE TRIGGER trg_ppr_stale_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.trg_stale_from_payment_like();

DROP TRIGGER IF EXISTS trg_ppr_stale_salaries ON public.salaries;
CREATE TRIGGER trg_ppr_stale_salaries
  AFTER INSERT OR UPDATE OR DELETE ON public.salaries
  FOR EACH ROW EXECUTE FUNCTION public.trg_stale_from_payment_like();

CREATE OR REPLACE FUNCTION public.trg_stale_from_adjustment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.mark_ppr_periods_stale_by_date(OLD.agency_id, OLD.effective_date);
    RETURN OLD;
  END IF;
  PERFORM public.mark_ppr_periods_stale_by_date(NEW.agency_id, NEW.effective_date);
  IF TG_OP = 'UPDATE' AND OLD.effective_date IS DISTINCT FROM NEW.effective_date THEN
    PERFORM public.mark_ppr_periods_stale_by_date(OLD.agency_id, OLD.effective_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ppr_stale_adjustments ON public.ppr_financial_adjustments;
CREATE TRIGGER trg_ppr_stale_adjustments
  AFTER INSERT OR UPDATE OR DELETE ON public.ppr_financial_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.trg_stale_from_adjustment();

CREATE OR REPLACE FUNCTION public.trg_stale_from_scorecard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pid uuid;
BEGIN
  v_pid := COALESCE(NEW.period_id, OLD.period_id);
  IF v_pid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  UPDATE public.bonus_periods
     SET calculation_status = 'stale'
   WHERE id = v_pid
     AND status <> 'closed'
     AND calculation_status = 'calculated';
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_ppr_stale_scorecards ON public.employee_scorecards;
CREATE TRIGGER trg_ppr_stale_scorecards
  AFTER INSERT OR UPDATE OR DELETE ON public.employee_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.trg_stale_from_scorecard();

-- ----------------------------------------------------------------
-- 10. Overlap helper (used by Edge Function)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_bonus_period_overlap(
  p_agency_id uuid, p_start date, p_end date, p_exclude_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bonus_periods
    WHERE agency_id = p_agency_id
      AND status = 'open'
      AND (p_exclude_id IS NULL OR id <> p_exclude_id)
      AND start_date <= p_end
      AND end_date >= p_start
  );
$$;
