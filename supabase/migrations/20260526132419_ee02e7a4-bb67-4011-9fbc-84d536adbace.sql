
DROP TRIGGER IF EXISTS trg_ppr_stale_client_payments ON public.client_payments;
DROP FUNCTION IF EXISTS public.trg_stale_from_payment_like() CASCADE;
DROP FUNCTION IF EXISTS public.mark_ppr_periods_stale_by_date(uuid, date) CASCADE;
