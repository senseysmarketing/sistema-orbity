ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS group_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_aggregated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_aggregation_window
  ON public.notifications (user_id, type, entity_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_sort
  ON public.notifications (user_id, COALESCE(last_aggregated_at, created_at) DESC);