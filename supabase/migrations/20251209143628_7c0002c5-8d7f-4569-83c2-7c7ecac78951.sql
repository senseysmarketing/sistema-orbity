-- Add default_status column to task_templates
ALTER TABLE public.task_templates
ADD COLUMN default_status text DEFAULT 'todo';

-- Add comment
COMMENT ON COLUMN public.task_templates.default_status IS 'Status padrão para tarefas criadas a partir deste template';