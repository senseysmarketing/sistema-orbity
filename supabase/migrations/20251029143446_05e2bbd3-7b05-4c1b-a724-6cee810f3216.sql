-- Criar tabela de atribuições de posts
CREATE TABLE IF NOT EXISTS public.post_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.post_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para post_assignments
CREATE POLICY "Agency members can view post assignments"
ON public.post_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.social_media_posts p
    WHERE p.id = post_assignments.post_id
    AND user_belongs_to_agency(p.agency_id)
  )
);

CREATE POLICY "Agency members can create post assignments"
ON public.post_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.social_media_posts p
    WHERE p.id = post_assignments.post_id
    AND user_belongs_to_agency(p.agency_id)
  )
);

CREATE POLICY "Agency members can delete post assignments"
ON public.post_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.social_media_posts p
    WHERE p.id = post_assignments.post_id
    AND user_belongs_to_agency(p.agency_id)
  )
);

-- Adicionar políticas RLS para task_assignments (caso não existam)
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view task assignments"
ON public.task_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignments.task_id
    AND user_belongs_to_agency(t.agency_id)
  )
);

CREATE POLICY "Agency members can create task assignments"
ON public.task_assignments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignments.task_id
    AND user_belongs_to_agency(t.agency_id)
  )
);

CREATE POLICY "Agency members can delete task assignments"
ON public.task_assignments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignments.task_id
    AND user_belongs_to_agency(t.agency_id)
  )
);

-- Habilitar Realtime para sincronização automática
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_post_assignments_updated_at
BEFORE UPDATE ON public.post_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();