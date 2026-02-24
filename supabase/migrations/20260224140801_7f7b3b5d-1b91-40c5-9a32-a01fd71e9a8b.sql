
-- ================================================
-- Tabela: bonus_programs
-- ================================================
CREATE TABLE public.bonus_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  program_type text NOT NULL DEFAULT 'ppr',
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bonus programs" ON public.bonus_programs
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Admins can insert bonus programs" ON public.bonus_programs
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can update bonus programs" ON public.bonus_programs
  FOR UPDATE USING (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can delete bonus programs" ON public.bonus_programs
  FOR DELETE USING (public.is_agency_admin(agency_id));

CREATE TRIGGER update_bonus_programs_updated_at
  BEFORE UPDATE ON public.bonus_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Tabela: bonus_periods
-- ================================================
CREATE TABLE public.bonus_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.bonus_programs(id) ON DELETE CASCADE,
  label text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  revenue_target numeric NOT NULL DEFAULT 0,
  revenue_actual numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  bonus_pool_percent numeric NOT NULL DEFAULT 10,
  bonus_pool_amount numeric NOT NULL DEFAULT 0,
  nps_target numeric NOT NULL DEFAULT 60,
  nps_actual numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bonus_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bonus periods" ON public.bonus_periods
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Admins can insert bonus periods" ON public.bonus_periods
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can update bonus periods" ON public.bonus_periods
  FOR UPDATE USING (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can delete bonus periods" ON public.bonus_periods
  FOR DELETE USING (public.is_agency_admin(agency_id));

CREATE TRIGGER update_bonus_periods_updated_at
  BEFORE UPDATE ON public.bonus_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Tabela: nps_responses
-- ================================================
CREATE TABLE public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.bonus_periods(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  category text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view nps responses" ON public.nps_responses
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Admins can insert nps responses" ON public.nps_responses
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can update nps responses" ON public.nps_responses
  FOR UPDATE USING (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can delete nps responses" ON public.nps_responses
  FOR DELETE USING (public.is_agency_admin(agency_id));

-- ================================================
-- Tabela: employee_scorecards
-- ================================================
CREATE TABLE public.employee_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.bonus_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  user_id uuid,
  nps_retention_score numeric NOT NULL DEFAULT 0,
  technical_delivery_score numeric NOT NULL DEFAULT 0,
  process_innovation_score numeric NOT NULL DEFAULT 0,
  weighted_average numeric NOT NULL DEFAULT 0,
  max_share numeric NOT NULL DEFAULT 0,
  final_bonus numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_scorecards ENABLE ROW LEVEL SECURITY;

-- Admins veem todos, usuarios comuns so veem o seu
CREATE POLICY "Members can view own or admin sees all scorecards" ON public.employee_scorecards
  FOR SELECT USING (
    public.is_agency_admin(agency_id) OR (public.user_belongs_to_agency(agency_id) AND user_id = auth.uid())
  );

CREATE POLICY "Admins can insert scorecards" ON public.employee_scorecards
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can update scorecards" ON public.employee_scorecards
  FOR UPDATE USING (public.is_agency_admin(agency_id));

CREATE POLICY "Admins can delete scorecards" ON public.employee_scorecards
  FOR DELETE USING (public.is_agency_admin(agency_id));

CREATE TRIGGER update_employee_scorecards_updated_at
  BEFORE UPDATE ON public.employee_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
