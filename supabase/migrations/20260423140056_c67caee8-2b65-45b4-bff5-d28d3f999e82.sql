ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS whatsapp_auto_contact BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_ghosting BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agencies_auto_ghosting
  ON public.agencies(id) WHERE whatsapp_auto_ghosting = true;