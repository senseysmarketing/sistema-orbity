-- 1) Branding columns + CHECK constraint elegante
ALTER TABLE public.agencies 
  ADD COLUMN IF NOT EXISTS brand_theme TEXT DEFAULT 'obsidian',
  ADD COLUMN IF NOT EXISTS public_email TEXT,
  ADD COLUMN IF NOT EXISTS public_phone TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- logo_url já existe (verificado no schema)

-- CHECK constraint para temas permitidos
ALTER TABLE public.agencies DROP CONSTRAINT IF EXISTS agencies_brand_theme_check;
ALTER TABLE public.agencies 
  ADD CONSTRAINT agencies_brand_theme_check 
  CHECK (brand_theme IN ('obsidian', 'midnight', 'amethyst', 'forest', 'graphite'));

-- 2) Bucket público para logos
INSERT INTO storage.buckets (id, name, public) 
  VALUES ('agency-logos', 'agency-logos', true) 
  ON CONFLICT (id) DO NOTHING;

-- 3) RLS Policies do bucket
DROP POLICY IF EXISTS "Public read agency logos" ON storage.objects;
CREATE POLICY "Public read agency logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'agency-logos');

DROP POLICY IF EXISTS "Admins upload own agency logos" ON storage.objects;
CREATE POLICY "Admins upload own agency logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'agency-logos' 
    AND public.is_agency_admin(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Admins update own agency logos" ON storage.objects;
CREATE POLICY "Admins update own agency logos" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'agency-logos' 
    AND public.is_agency_admin(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "Admins delete own agency logos" ON storage.objects;
CREATE POLICY "Admins delete own agency logos" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'agency-logos' 
    AND public.is_agency_admin(((storage.foldername(name))[1])::uuid)
  );