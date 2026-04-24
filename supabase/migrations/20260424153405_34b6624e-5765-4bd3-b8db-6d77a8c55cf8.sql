-- 1) Default 7 dias para novos links
ALTER TABLE public.task_approvals 
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- 2) GUARDRAIL #2 — Recriar FK com CASCADE explícito (blinda o GC)
ALTER TABLE public.task_approval_items 
  DROP CONSTRAINT IF EXISTS task_approval_items_approval_id_fkey;

ALTER TABLE public.task_approval_items 
  ADD CONSTRAINT task_approval_items_approval_id_fkey 
  FOREIGN KEY (approval_id) 
  REFERENCES public.task_approvals(id) 
  ON DELETE CASCADE;

-- 3) Índices de performance para reuso (match perfeito) e GC
CREATE INDEX IF NOT EXISTS idx_task_approval_items_task_lookup 
  ON public.task_approval_items(task_id, approval_id);

CREATE INDEX IF NOT EXISTS idx_task_approvals_active_lookup
  ON public.task_approvals(agency_id, status, expires_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_task_approvals_gc 
  ON public.task_approvals(expires_at);