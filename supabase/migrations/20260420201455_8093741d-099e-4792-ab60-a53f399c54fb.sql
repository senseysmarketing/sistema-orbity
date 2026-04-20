ALTER TABLE public.bonus_periods 
  ADD COLUMN IF NOT EXISTS min_nps_target numeric(3,1) NOT NULL DEFAULT 8.0;