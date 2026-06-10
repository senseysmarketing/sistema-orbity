ALTER TABLE public.whatsapp_accounts
  ADD COLUMN IF NOT EXISTS connection_mode text NOT NULL DEFAULT 'managed',
  ADD COLUMN IF NOT EXISTS webhook_managed_by_orbity boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_manual_validation_at timestamptz;

ALTER TABLE public.whatsapp_accounts
  DROP CONSTRAINT IF EXISTS whatsapp_accounts_connection_mode_check;

ALTER TABLE public.whatsapp_accounts
  ADD CONSTRAINT whatsapp_accounts_connection_mode_check
  CHECK (connection_mode IN ('managed', 'external'));