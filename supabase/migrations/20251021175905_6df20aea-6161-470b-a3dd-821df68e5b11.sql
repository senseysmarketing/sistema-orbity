-- Create task_statuses table for customizable Kanban columns
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for task_statuses
CREATE POLICY "Agency admins can manage task statuses"
ON public.task_statuses
FOR ALL
USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view task statuses"
ON public.task_statuses
FOR SELECT
USING (user_belongs_to_agency(agency_id));