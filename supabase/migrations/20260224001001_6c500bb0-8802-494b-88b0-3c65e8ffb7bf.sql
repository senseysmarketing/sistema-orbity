
-- Content Plans: stores the AI-generated content plan for a client/period
CREATE TABLE public.content_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  month_year TEXT NOT NULL, -- e.g. '2026-02'
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  strategy_context JSONB NOT NULL DEFAULT '{}', -- wizard answers
  ai_response JSONB, -- raw AI response for reference
  depth_level TEXT NOT NULL DEFAULT 'summary' CHECK (depth_level IN ('summary', 'detailed')),
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Content Plan Items: each individual content piece in the plan
CREATE TABLE public.content_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  day_number INTEGER,
  post_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT, -- educativo, autoridade, conversao, etc.
  format TEXT, -- carrossel, reels, stories, feed
  platform TEXT,
  creative_instructions TEXT,
  objective TEXT,
  hashtags TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'task_created', 'in_progress', 'published')),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_content_plans_agency ON public.content_plans(agency_id);
CREATE INDEX idx_content_plans_client ON public.content_plans(client_id);
CREATE INDEX idx_content_plans_month ON public.content_plans(month_year);
CREATE INDEX idx_content_plan_items_plan ON public.content_plan_items(plan_id);
CREATE INDEX idx_content_plan_items_task ON public.content_plan_items(task_id);

-- RLS
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency plans"
ON public.content_plans FOR SELECT
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can create plans for their agency"
ON public.content_plans FOR INSERT
WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can update their agency plans"
ON public.content_plans FOR UPDATE
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can delete their agency plans"
ON public.content_plans FOR DELETE
USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Users can view plan items via plan"
ON public.content_plan_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.content_plans cp
  WHERE cp.id = plan_id AND public.user_belongs_to_agency(cp.agency_id)
));

CREATE POLICY "Users can create plan items"
ON public.content_plan_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.content_plans cp
  WHERE cp.id = plan_id AND public.user_belongs_to_agency(cp.agency_id)
));

CREATE POLICY "Users can update plan items"
ON public.content_plan_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.content_plans cp
  WHERE cp.id = plan_id AND public.user_belongs_to_agency(cp.agency_id)
));

CREATE POLICY "Users can delete plan items"
ON public.content_plan_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.content_plans cp
  WHERE cp.id = plan_id AND public.user_belongs_to_agency(cp.agency_id)
));

-- Triggers
CREATE TRIGGER update_content_plans_updated_at
BEFORE UPDATE ON public.content_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_plan_items_updated_at
BEFORE UPDATE ON public.content_plan_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
