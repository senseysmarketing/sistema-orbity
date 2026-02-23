
-- Adicionar colunas de redes sociais na tabela tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS post_type text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS post_date timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS hashtags text[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS creative_instructions text;

-- Índice para filtrar tarefas de redes sociais
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks (task_type);
