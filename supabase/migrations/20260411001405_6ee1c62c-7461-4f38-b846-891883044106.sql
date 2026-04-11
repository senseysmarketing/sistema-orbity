-- Add new columns for SaaS Tracker
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS base_value NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC;

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_expense_subscription_fields()
RETURNS trigger LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.subscription_status IS NOT NULL AND
     NEW.subscription_status NOT IN ('active', 'paused', 'canceled') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', NEW.subscription_status;
  END IF;
  IF NEW.currency IS NOT NULL AND
     NEW.currency NOT IN ('BRL', 'USD', 'EUR') THEN
    RAISE EXCEPTION 'Invalid currency: %', NEW.currency;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_expense_subscription ON public.expenses;
CREATE TRIGGER trg_validate_expense_subscription
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.validate_expense_subscription_fields();

-- Backfill historical data (Blindagem 3)
UPDATE public.expenses
SET base_value = amount,
    subscription_status = 'active',
    currency = 'BRL'
WHERE expense_type = 'recorrente' AND base_value IS NULL;