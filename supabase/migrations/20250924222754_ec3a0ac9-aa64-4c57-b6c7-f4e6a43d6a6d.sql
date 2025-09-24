-- Criar tabela para relacionamento many-to-many entre tarefas e usuários
CREATE TABLE public.task_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Evitar atribuições duplicadas
  UNIQUE(task_id, user_id)
);

-- Habilitar RLS na nova tabela
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para task_assignments
CREATE POLICY "Agency members can view task assignments for their agency tasks" 
ON public.task_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignments.task_id 
    AND user_belongs_to_agency(tasks.agency_id)
  )
);

CREATE POLICY "Agency members can create task assignments for their agency tasks" 
ON public.task_assignments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignments.task_id 
    AND user_belongs_to_agency(tasks.agency_id)
  )
);

CREATE POLICY "Agency members can update task assignments for their agency tasks" 
ON public.task_assignments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignments.task_id 
    AND user_belongs_to_agency(tasks.agency_id)
  )
);

CREATE POLICY "Agency admins can delete task assignments for their agency tasks" 
ON public.task_assignments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE tasks.id = task_assignments.task_id 
    AND is_agency_admin(tasks.agency_id)
  )
);

-- Migrar dados existentes da coluna assigned_to para a nova tabela
INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
SELECT id, assigned_to, created_by 
FROM public.tasks 
WHERE assigned_to IS NOT NULL;

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_task_assignments_updated_at
BEFORE UPDATE ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentar a coluna antiga (mantemos por compatibilidade por enquanto)
COMMENT ON COLUMN public.tasks.assigned_to IS 'Deprecated: Use task_assignments table instead';