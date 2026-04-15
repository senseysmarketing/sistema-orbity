CREATE TABLE public.billing_message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.client_payments(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('reminder', 'overdue')),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view billing logs"
  ON public.billing_message_logs FOR SELECT TO authenticated
  USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Service role can insert billing logs"
  ON public.billing_message_logs FOR INSERT TO service_role
  WITH CHECK (true);

CREATE INDEX idx_billing_message_logs_agency_created
  ON public.billing_message_logs (agency_id, created_at DESC);