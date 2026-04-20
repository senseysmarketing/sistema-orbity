-- Recurring tasks: schema + atomic RPC
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS next_occurrence_generated BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent ON public.tasks(recurrence_parent_id);

CREATE OR REPLACE FUNCTION public.generate_next_recurring_task(
  p_task_id UUID,
  p_next_due_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig public.tasks%ROWTYPE;
  v_new_id UUID;
  v_parent_id UUID;
  v_subtasks JSONB;
BEGIN
  SELECT * INTO v_orig FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found', p_task_id;
  END IF;
  IF v_orig.next_occurrence_generated THEN
    RETURN NULL;
  END IF;
  IF NOT COALESCE(v_orig.is_recurring, false) THEN
    RETURN NULL;
  END IF;

  v_parent_id := COALESCE(v_orig.recurrence_parent_id, v_orig.id);

  -- Reset subtasks completed=false
  IF v_orig.subtasks IS NOT NULL AND jsonb_typeof(v_orig.subtasks) = 'array' THEN
    SELECT COALESCE(jsonb_agg(jsonb_set(elem, '{completed}', 'false'::jsonb)), '[]'::jsonb)
      INTO v_subtasks
      FROM jsonb_array_elements(v_orig.subtasks) elem;
  ELSE
    v_subtasks := v_orig.subtasks;
  END IF;

  -- Clone task
  INSERT INTO public.tasks (
    title, description, priority, status, due_date, agency_id, client_id, is_internal,
    task_type, platform, post_type, hashtags, creative_instructions, subtasks,
    is_recurring, recurrence_rule, recurrence_parent_id, next_occurrence_generated,
    created_by
  ) VALUES (
    v_orig.title, v_orig.description, v_orig.priority, 'todo', p_next_due_date,
    v_orig.agency_id, v_orig.client_id, v_orig.is_internal,
    v_orig.task_type, v_orig.platform, v_orig.post_type, v_orig.hashtags, v_orig.creative_instructions,
    v_subtasks,
    true, v_orig.recurrence_rule, v_parent_id, false,
    v_orig.created_by
  ) RETURNING id INTO v_new_id;

  -- Clone assignments
  INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
  SELECT v_new_id, user_id, assigned_by FROM public.task_assignments WHERE task_id = p_task_id;

  -- Clone clients (multi-cliente)
  INSERT INTO public.task_clients (task_id, client_id)
  SELECT v_new_id, client_id FROM public.task_clients WHERE task_id = p_task_id;

  -- Mark original as generated
  UPDATE public.tasks SET next_occurrence_generated = true WHERE id = p_task_id;

  RETURN v_new_id;
END;
$$;