-- Create task_templates table for storing task templates
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT DEFAULT '📋',
  
  -- Template data
  default_title TEXT,
  default_description TEXT,
  default_priority TEXT DEFAULT 'medium',
  estimated_duration_hours INTEGER,
  subtasks JSONB DEFAULT '[]',
  
  -- Automation
  auto_assign_creator BOOLEAN DEFAULT false,
  default_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  due_date_offset_days INTEGER,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_task_templates_agency_id ON public.task_templates(agency_id);
CREATE INDEX idx_task_templates_category ON public.task_templates(category);
CREATE INDEX idx_task_templates_is_active ON public.task_templates(is_active);

-- Enable RLS
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agency members can view task templates"
ON public.task_templates FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create task templates"
ON public.task_templates FOR INSERT
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update task templates"
ON public.task_templates FOR UPDATE
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can delete task templates"
ON public.task_templates FOR DELETE
USING (is_agency_admin(agency_id));

-- Add updated_at trigger
CREATE TRIGGER update_task_templates_updated_at
BEFORE UPDATE ON public.task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.task_templates IS 'Stores reusable task templates with predefined subtasks and settings';