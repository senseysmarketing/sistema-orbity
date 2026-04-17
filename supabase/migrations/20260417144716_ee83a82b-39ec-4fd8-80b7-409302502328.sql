ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS health_score_rules JSONB;