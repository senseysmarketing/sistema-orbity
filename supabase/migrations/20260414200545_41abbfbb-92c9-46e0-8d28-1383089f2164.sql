-- Add purpose column to whatsapp_accounts
ALTER TABLE whatsapp_accounts ADD COLUMN purpose text NOT NULL DEFAULT 'general';

-- Drop existing unique constraint on agency_id
ALTER TABLE whatsapp_accounts DROP CONSTRAINT IF EXISTS whatsapp_accounts_agency_id_key;

-- New composite unique: 1 account per agency per purpose
CREATE UNIQUE INDEX whatsapp_accounts_agency_purpose_idx ON whatsapp_accounts (agency_id, purpose);

-- Unique instance_name globally (avoid Evolution API conflicts)
CREATE UNIQUE INDEX whatsapp_accounts_instance_name_idx ON whatsapp_accounts (instance_name);

-- Add toggle to agency_payment_settings
ALTER TABLE agency_payment_settings ADD COLUMN use_separate_billing_whatsapp boolean NOT NULL DEFAULT false;