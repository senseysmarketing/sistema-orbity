
-- Create agency_invites table
CREATE TABLE public.agency_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;

-- Master admins can read all invites
CREATE POLICY "Master admins can read invites"
ON public.agency_invites
FOR SELECT
TO authenticated
USING (public.is_master_agency_admin());

-- Master admins can create invites
CREATE POLICY "Master admins can create invites"
ON public.agency_invites
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_agency_admin());

-- Anon users can read invite by token (for registration page)
CREATE POLICY "Anyone can read invite by token"
ON public.agency_invites
FOR SELECT
TO anon
USING (true);

-- Index for fast token lookup
CREATE INDEX idx_agency_invites_token ON public.agency_invites(token);
