-- Add scheduling columns to orbity_leads
ALTER TABLE public.orbity_leads
  ADD COLUMN IF NOT EXISTS agency_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'application';