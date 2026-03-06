ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;