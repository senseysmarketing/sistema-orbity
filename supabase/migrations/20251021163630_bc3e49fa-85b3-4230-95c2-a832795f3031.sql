-- Tabela para status customizados do Kanban
CREATE TABLE IF NOT EXISTS public.social_media_custom_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- Tabela para tipos de conteúdo customizados
CREATE TABLE IF NOT EXISTS public.social_media_content_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT '📄',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- Tabela para plataformas
CREATE TABLE IF NOT EXISTS public.social_media_platforms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT '📱',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, slug)
);

-- Tabela para regras de aprovação
CREATE TABLE IF NOT EXISTS public.social_media_approval_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  approvers JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para templates de postagem
CREATE TABLE IF NOT EXISTS public.social_media_post_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
  post_type TEXT NOT NULL,
  content_template TEXT,
  hashtags TEXT[] DEFAULT '{}',
  mentions TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para horários padrão
CREATE TABLE IF NOT EXISTS public.social_media_schedule_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  preferred_times JSONB NOT NULL DEFAULT '[]',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.social_media_custom_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_schedule_preferences ENABLE ROW LEVEL SECURITY;

-- Policies para custom statuses
CREATE POLICY "Agency members can view custom statuses"
  ON public.social_media_custom_statuses FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage custom statuses"
  ON public.social_media_custom_statuses FOR ALL
  USING (is_agency_admin(agency_id));

-- Policies para content types
CREATE POLICY "Agency members can view content types"
  ON public.social_media_content_types FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage content types"
  ON public.social_media_content_types FOR ALL
  USING (is_agency_admin(agency_id));

-- Policies para platforms
CREATE POLICY "Agency members can view platforms"
  ON public.social_media_platforms FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage platforms"
  ON public.social_media_platforms FOR ALL
  USING (is_agency_admin(agency_id));

-- Policies para approval rules
CREATE POLICY "Agency members can view approval rules"
  ON public.social_media_approval_rules FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage approval rules"
  ON public.social_media_approval_rules FOR ALL
  USING (is_agency_admin(agency_id));

-- Policies para post templates
CREATE POLICY "Agency members can view post templates"
  ON public.social_media_post_templates FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create post templates"
  ON public.social_media_post_templates FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage post templates"
  ON public.social_media_post_templates FOR ALL
  USING (is_agency_admin(agency_id));

-- Policies para schedule preferences
CREATE POLICY "Agency members can view schedule preferences"
  ON public.social_media_schedule_preferences FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage schedule preferences"
  ON public.social_media_schedule_preferences FOR ALL
  USING (is_agency_admin(agency_id));

-- Triggers para updated_at
CREATE TRIGGER update_social_media_custom_statuses_updated_at
  BEFORE UPDATE ON public.social_media_custom_statuses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_content_types_updated_at
  BEFORE UPDATE ON public.social_media_content_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_platforms_updated_at
  BEFORE UPDATE ON public.social_media_platforms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_approval_rules_updated_at
  BEFORE UPDATE ON public.social_media_approval_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_post_templates_updated_at
  BEFORE UPDATE ON public.social_media_post_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_schedule_preferences_updated_at
  BEFORE UPDATE ON public.social_media_schedule_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();