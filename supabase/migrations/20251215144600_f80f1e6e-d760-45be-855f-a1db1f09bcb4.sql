-- Criar tabela de junção para tasks e clients
CREATE TABLE public.task_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, client_id)
);

-- Criar tabela de junção para social_media_posts e clients
CREATE TABLE public.post_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, client_id)
);

-- Criar tabela de junção para meetings e clients
CREATE TABLE public.meeting_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, client_id)
);

-- Habilitar RLS
ALTER TABLE public.task_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_clients ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para task_clients
CREATE POLICY "Agency members can view task clients"
ON public.task_clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_belongs_to_agency(t.agency_id)
  )
);

CREATE POLICY "Agency members can manage task clients"
ON public.task_clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.user_belongs_to_agency(t.agency_id)
  )
);

-- Políticas RLS para post_clients
CREATE POLICY "Agency members can view post clients"
ON public.post_clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.social_media_posts p
    WHERE p.id = post_id AND public.user_belongs_to_agency(p.agency_id)
  )
);

CREATE POLICY "Agency members can manage post clients"
ON public.post_clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.social_media_posts p
    WHERE p.id = post_id AND public.user_belongs_to_agency(p.agency_id)
  )
);

-- Políticas RLS para meeting_clients
CREATE POLICY "Agency members can view meeting clients"
ON public.meeting_clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND public.user_belongs_to_agency(m.agency_id)
  )
);

CREATE POLICY "Agency members can manage meeting clients"
ON public.meeting_clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.meetings m
    WHERE m.id = meeting_id AND public.user_belongs_to_agency(m.agency_id)
  )
);

-- Criar índices para performance
CREATE INDEX idx_task_clients_task_id ON public.task_clients(task_id);
CREATE INDEX idx_task_clients_client_id ON public.task_clients(client_id);
CREATE INDEX idx_post_clients_post_id ON public.post_clients(post_id);
CREATE INDEX idx_post_clients_client_id ON public.post_clients(client_id);
CREATE INDEX idx_meeting_clients_meeting_id ON public.meeting_clients(meeting_id);
CREATE INDEX idx_meeting_clients_client_id ON public.meeting_clients(client_id);

-- Migrar dados existentes do client_id para as tabelas de junção
INSERT INTO public.task_clients (task_id, client_id)
SELECT id, client_id FROM public.tasks WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.post_clients (post_id, client_id)
SELECT id, client_id FROM public.social_media_posts WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.meeting_clients (meeting_id, client_id)
SELECT id, client_id FROM public.meetings WHERE client_id IS NOT NULL
ON CONFLICT DO NOTHING;