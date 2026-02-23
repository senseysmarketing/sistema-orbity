-- Renomear slug nas tarefas existentes
UPDATE public.tasks SET task_type = 'criativos' WHERE task_type = 'design';

-- Renomear slug e nome na tabela de tipos
UPDATE public.task_types SET slug = 'criativos', name = 'Criativos' 
WHERE slug = 'design' AND is_default = true;