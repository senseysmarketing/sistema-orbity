
CREATE TABLE public.agency_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active_gateway TEXT NOT NULL DEFAULT 'manual' CHECK (active_gateway IN ('manual', 'asaas')),
  asaas_api_key TEXT,
  asaas_sandbox BOOLEAN DEFAULT true,
  reminder_before_enabled BOOLEAN DEFAULT false,
  reminder_before_days INTEGER DEFAULT 3,
  reminder_due_date_enabled BOOLEAN DEFAULT false,
  reminder_overdue_enabled BOOLEAN DEFAULT false,
  reminder_overdue_days INTEGER DEFAULT 1,
  block_access_enabled BOOLEAN DEFAULT false,
  block_access_days INTEGER DEFAULT 5,
  whatsapp_template_reminder TEXT,
  whatsapp_template_overdue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agency_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency admins manage payment settings"
  ON public.agency_payment_settings FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

CREATE TRIGGER update_agency_payment_settings_updated_at
  BEFORE UPDATE ON public.agency_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
