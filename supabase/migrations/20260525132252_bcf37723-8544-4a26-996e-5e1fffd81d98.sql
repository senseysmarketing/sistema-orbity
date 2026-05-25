
DROP TABLE IF EXISTS public.ppr_calculation_logs CASCADE;
DROP TABLE IF EXISTS public.ppr_employee_results CASCADE;
DROP TABLE IF EXISTS public.ppr_financial_adjustments CASCADE;
DROP TABLE IF EXISTS public.ppr_period_months CASCADE;
DROP TABLE IF EXISTS public.employee_scorecards CASCADE;
DROP TABLE IF EXISTS public.nps_responses CASCADE;
DROP TABLE IF EXISTS public.nps_tokens CASCADE;
DROP TABLE IF EXISTS public.nps_settings CASCADE;
DROP TABLE IF EXISTS public.bonus_periods CASCADE;
DROP TABLE IF EXISTS public.bonus_programs CASCADE;

DROP FUNCTION IF EXISTS public.calculate_ppr_period(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_ppr_period(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.close_ppr_period(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.reopen_ppr_period(uuid) CASCADE;
