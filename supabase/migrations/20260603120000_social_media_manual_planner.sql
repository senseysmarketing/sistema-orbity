-- Social Media Planner: manual planning support

ALTER TABLE public.content_plans
ADD COLUMN IF NOT EXISTS creation_mode TEXT NOT NULL DEFAULT 'ai';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'content_plans_creation_mode_check'
      AND conrelid = 'public.content_plans'::regclass
  ) THEN
    ALTER TABLE public.content_plans
    ADD CONSTRAINT content_plans_creation_mode_check
    CHECK (creation_mode IN ('ai', 'manual', 'imported'));
  END IF;
END $$;

ALTER TABLE public.content_plan_items
ADD COLUMN IF NOT EXISTS order_position INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS reference_notes TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'content_plan_items_status_check'
      AND conrelid = 'public.content_plan_items'::regclass
  ) THEN
    ALTER TABLE public.content_plan_items
    DROP CONSTRAINT content_plan_items_status_check;
  END IF;

  ALTER TABLE public.content_plan_items
  ADD CONSTRAINT content_plan_items_status_check
  CHECK (status IN ('planned', 'task_created', 'in_progress', 'published', 'discarded'));
END $$;

WITH ranked_items AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY plan_id
      ORDER BY post_date NULLS LAST, day_number NULLS LAST, created_at, id
    ) - 1 AS next_position
  FROM public.content_plan_items
)
UPDATE public.content_plan_items cpi
SET order_position = ranked_items.next_position
FROM ranked_items
WHERE ranked_items.id = cpi.id
  AND cpi.order_position = 0;

CREATE INDEX IF NOT EXISTS idx_content_plan_items_plan_order
ON public.content_plan_items(plan_id, order_position);
