-- Criar tabela task_types
CREATE TABLE public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📋',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- RLS
ALTER TABLE public.task_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task types of their agency"
  ON public.task_types FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage task types of their agency"
  ON public.task_types FOR ALL
  USING (agency_id IN (SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()));

-- Adicionar coluna task_type na tabela tasks
ALTER TABLE public.tasks
ADD COLUMN task_type TEXT;

-- Adicionar coluna default_task_type na tabela task_templates
ALTER TABLE public.task_templates
ADD COLUMN default_task_type TEXT;