-- clients: default billing type
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS default_billing_type TEXT DEFAULT 'manual';

-- client_payments: billing type per payment
ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'manual';

-- agency_payment_settings: boolean switches per gateway
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS asaas_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conexa_enabled BOOLEAN DEFAULT false;

-- Validation trigger for clients.default_billing_type
CREATE OR REPLACE FUNCTION public.validate_client_billing_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.default_billing_type IS NOT NULL AND
     NEW.default_billing_type NOT IN ('manual', 'asaas', 'conexa') THEN
    RAISE EXCEPTION 'Invalid billing type: %', NEW.default_billing_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_client_billing_type ON public.clients;
CREATE TRIGGER trg_validate_client_billing_type
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_billing_type();

-- Validation trigger for client_payments.billing_type
CREATE OR REPLACE FUNCTION public.validate_payment_billing_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.billing_type IS NOT NULL AND
     NEW.billing_type NOT IN ('manual', 'asaas', 'conexa') THEN
    RAISE EXCEPTION 'Invalid billing type: %', NEW.billing_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_payment_billing_type ON public.client_payments;
CREATE TRIGGER trg_validate_payment_billing_type
  BEFORE INSERT OR UPDATE ON public.client_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_payment_billing_type();

-- Backfill: mark existing gateways as enabled
UPDATE public.agency_payment_settings
SET asaas_enabled = true
WHERE active_gateway = 'asaas';

UPDATE public.agency_payment_settings
SET conexa_enabled = true
WHERE active_gateway = 'conexa';