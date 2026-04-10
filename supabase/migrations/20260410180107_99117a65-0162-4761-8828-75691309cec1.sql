-- Add status CHECK constraints to financial tables
-- First drop any existing constraints to be safe
ALTER TABLE public.client_payments DROP CONSTRAINT IF EXISTS client_payments_status_check;
ALTER TABLE public.client_payments ADD CONSTRAINT client_payments_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

ALTER TABLE public.salaries DROP CONSTRAINT IF EXISTS salaries_status_check;
ALTER TABLE public.salaries ADD CONSTRAINT salaries_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));