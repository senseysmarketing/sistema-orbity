
-- Add webhook token columns to agency_payment_settings
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS asaas_webhook_token TEXT,
  ADD COLUMN IF NOT EXISTS conexa_webhook_token TEXT;

-- Create notification_queue table (backend-only)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Index for processing pending notifications
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON public.notification_queue (status) WHERE status = 'pending';

-- Index for agency lookup
CREATE INDEX IF NOT EXISTS idx_notification_queue_agency ON public.notification_queue (agency_id);
