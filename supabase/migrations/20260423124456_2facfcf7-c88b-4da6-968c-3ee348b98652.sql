-- Tabela de links de aprovação
CREATE TABLE public.task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 days'),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_task_approvals_token ON public.task_approvals(token);
CREATE INDEX idx_task_approvals_agency ON public.task_approvals(agency_id);

-- Junção N:N (Smart Batch)
CREATE TABLE public.task_approval_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.task_approvals(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  decision TEXT,
  client_feedback TEXT,
  decided_at TIMESTAMPTZ,
  UNIQUE(approval_id, task_id)
);
CREATE INDEX idx_task_approval_items_approval ON public.task_approval_items(approval_id);
CREATE INDEX idx_task_approval_items_task ON public.task_approval_items(task_id);

-- Loop de refação
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- RLS
ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_approval_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage approvals"
  ON public.task_approvals FOR ALL TO authenticated
  USING (public.user_belongs_to_agency(agency_id))
  WITH CHECK (public.user_belongs_to_agency(agency_id));

CREATE POLICY "agency members manage approval items"
  ON public.task_approval_items FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.task_approvals a
    WHERE a.id = approval_id AND public.user_belongs_to_agency(a.agency_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_approvals a
    WHERE a.id = approval_id AND public.user_belongs_to_agency(a.agency_id)
  ));