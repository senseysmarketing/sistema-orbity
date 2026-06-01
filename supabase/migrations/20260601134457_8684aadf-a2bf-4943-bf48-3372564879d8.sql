-- Fase 1: Colunas para meio de faturamento Conexa em agency_payment_settings
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_invoicing_method_id integer,
  ADD COLUMN IF NOT EXISTS conexa_invoicing_method_name text,
  ADD COLUMN IF NOT EXISTS conexa_invoicing_method_type text,
  ADD COLUMN IF NOT EXISTS conexa_auto_generate_billet boolean NOT NULL DEFAULT false;

-- Fase 1: Novas colunas em client_payments para boleto/Pix separados + estado Conexa
ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS conexa_sale_id text,
  ADD COLUMN IF NOT EXISTS conexa_charge_url text,
  ADD COLUMN IF NOT EXISTS conexa_billet_url text,
  ADD COLUMN IF NOT EXISTS conexa_pix_qr_code text,
  ADD COLUMN IF NOT EXISTS conexa_raw_charge jsonb,
  ADD COLUMN IF NOT EXISTS conexa_billing_status text,
  ADD COLUMN IF NOT EXISTS conexa_last_sync_at timestamptz;

-- Fase 8: Tabela de logs estruturados da API Conexa
CREATE TABLE IF NOT EXISTS public.conexa_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  payment_id uuid,
  client_id uuid,
  operation text NOT NULL,
  endpoint text,
  http_status integer,
  success boolean NOT NULL DEFAULT false,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conexa_api_logs_agency_created
  ON public.conexa_api_logs(agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conexa_api_logs_payment
  ON public.conexa_api_logs(payment_id);

CREATE INDEX IF NOT EXISTS idx_conexa_api_logs_operation
  ON public.conexa_api_logs(operation, created_at DESC);

GRANT SELECT ON public.conexa_api_logs TO authenticated;
GRANT ALL ON public.conexa_api_logs TO service_role;

ALTER TABLE public.conexa_api_logs ENABLE ROW LEVEL SECURITY;

-- Só usuários da agência (e master admin) podem ler; insert via service_role.
CREATE POLICY "Agency members can read their conexa logs"
  ON public.conexa_api_logs
  FOR SELECT
  TO authenticated
  USING (
    agency_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.agency_users au
      WHERE au.agency_id = public.conexa_api_logs.agency_id
        AND au.user_id = (select auth.uid())
    )
  );

-- Backfill best-effort: cobranças sem chargeUrl provavelmente armazenavam saleId em conexa_charge_id
UPDATE public.client_payments
SET conexa_sale_id = conexa_charge_id
WHERE billing_type = 'conexa'
  AND conexa_sale_id IS NULL
  AND conexa_charge_id IS NOT NULL
  AND conexa_invoice_url IS NULL
  AND status = 'pending';