
-- =============================================
-- PROJECTS MODULE - 5 Tables + RLS + Triggers
-- =============================================

-- 1. projects
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'outro',
  start_date date,
  end_date date,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_interval text,
  created_by uuid,
  responsible_id uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency projects" ON public.projects
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Members can manage agency projects" ON public.projects
  FOR ALL USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. project_tasks
CREATE TABLE public.project_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'backlog',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid,
  due_date date,
  completed_at timestamptz,
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency project tasks" ON public.project_tasks
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Members can manage agency project tasks" ON public.project_tasks
  FOR ALL USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. project_milestones
CREATE TABLE public.project_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  due_date date,
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency milestones" ON public.project_milestones
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Members can manage agency milestones" ON public.project_milestones
  FOR ALL USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- 4. project_payments
CREATE TABLE public.project_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  amount numeric NOT NULL,
  due_date date,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency payments" ON public.project_payments
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Members can manage agency payments" ON public.project_payments
  FOR ALL USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- 5. project_notes
CREATE TABLE public.project_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  content text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agency notes" ON public.project_notes
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));

CREATE POLICY "Members can manage agency notes" ON public.project_notes
  FOR ALL USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

-- Indexes for performance
CREATE INDEX idx_projects_agency_id ON public.projects(agency_id);
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_project_tasks_project_id ON public.project_tasks(project_id);
CREATE INDEX idx_project_milestones_project_id ON public.project_milestones(project_id);
CREATE INDEX idx_project_payments_project_id ON public.project_payments(project_id);
CREATE INDEX idx_project_notes_project_id ON public.project_notes(project_id);
