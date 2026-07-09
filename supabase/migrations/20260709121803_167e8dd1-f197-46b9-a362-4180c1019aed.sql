ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS legal_name text;
UPDATE public.clients SET legal_name = name WHERE legal_name IS NULL;