
-- 1. Add client_id and period to nps_responses, make period_id nullable
ALTER TABLE public.nps_responses 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

ALTER TABLE public.nps_responses 
  ADD COLUMN IF NOT EXISTS period text;

ALTER TABLE public.nps_responses ALTER COLUMN period_id DROP NOT NULL;

-- 2. nps_tokens table
CREATE TABLE public.nps_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tokens" ON public.nps_tokens 
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
CREATE POLICY "Admins insert tokens" ON public.nps_tokens 
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));
CREATE POLICY "Public read any token" ON public.nps_tokens 
  FOR SELECT TO anon USING (true);
CREATE POLICY "Public update token" ON public.nps_tokens 
  FOR UPDATE USING (is_used = false) WITH CHECK (is_used = true);

-- 3. nps_settings table
CREATE TABLE public.nps_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
  frequency text NOT NULL DEFAULT 'quarterly',
  auto_send boolean NOT NULL DEFAULT false,
  whatsapp_instance_id uuid REFERENCES public.whatsapp_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view nps settings" ON public.nps_settings 
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
CREATE POLICY "Admins manage nps settings" ON public.nps_settings 
  FOR ALL USING (public.is_agency_admin(agency_id));

-- 4. Public policies for nps_responses
CREATE POLICY "Public insert nps via token" ON public.nps_responses 
  FOR INSERT TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nps_tokens t 
      WHERE t.client_id = nps_responses.client_id 
      AND t.is_used = false 
      AND t.expires_at > now()
    )
  );

CREATE POLICY "Public read own nps" ON public.nps_responses 
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.nps_tokens t 
      WHERE t.client_id = nps_responses.client_id
    )
  );
