
-- Table for custom AI prompts per agency
CREATE TABLE public.agency_ai_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('task', 'post')),
  custom_prompt TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, prompt_type)
);

-- Enable RLS
ALTER TABLE public.agency_ai_prompts ENABLE ROW LEVEL SECURITY;

-- Members can read their agency's prompts
CREATE POLICY "Agency members can read AI prompts"
  ON public.agency_ai_prompts
  FOR SELECT
  USING (public.user_belongs_to_agency(agency_id));

-- Only admins can insert
CREATE POLICY "Agency admins can insert AI prompts"
  ON public.agency_ai_prompts
  FOR INSERT
  WITH CHECK (public.is_agency_admin(agency_id));

-- Only admins can update
CREATE POLICY "Agency admins can update AI prompts"
  ON public.agency_ai_prompts
  FOR UPDATE
  USING (public.is_agency_admin(agency_id));

-- Only admins can delete
CREATE POLICY "Agency admins can delete AI prompts"
  ON public.agency_ai_prompts
  FOR DELETE
  USING (public.is_agency_admin(agency_id));

-- Auto-update updated_at
CREATE TRIGGER update_agency_ai_prompts_updated_at
  BEFORE UPDATE ON public.agency_ai_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
