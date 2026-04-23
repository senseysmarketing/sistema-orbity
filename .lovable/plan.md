

# Approval Suite 2.0 — Implementação com Guardrails Finais

Plano aprovado, agora consolidado com os 3 guardrails de segurança/UX adicionais. Pronto para implementação.

## 1. Migração SQL

```sql
-- Tabela de links de aprovação (com expires_at)
CREATE TABLE public.task_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | partial | completed | expired
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

-- Loop de refação
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- RLS
ALTER TABLE public.task_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_approval_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members manage approvals"
  ON public.task_approvals FOR ALL TO authenticated
  USING (user_belongs_to_agency(agency_id))
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "agency members manage approval items"
  ON public.task_approval_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.task_approvals a 
                 WHERE a.id = approval_id AND user_belongs_to_agency(a.agency_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.task_approvals a 
                      WHERE a.id = approval_id AND user_belongs_to_agency(a.agency_id)));
```

Acesso público vai exclusivamente via Edge Functions com Service Role.

## 2. Edge Functions (`verify_jwt = false`)

### `approval-get` — `GET ?token=...`

```ts
const { data: approval } = await admin.from('task_approvals')
  .select('*, agencies(name, logo_url), task_approval_items(*, tasks(id,title,description,attachments))')
  .eq('token', token).maybeSingle();

if (!approval) return 404;

// GUARDRAIL 1: Expiração
if (new Date() > new Date(approval.expires_at)) {
  if (approval.status !== 'expired') 
    await admin.from('task_approvals').update({ status: 'expired' }).eq('id', approval.id);
  return new Response(JSON.stringify({ 
    error: 'expired',
    message: 'Este link de aprovação expirou por motivos de segurança. Por favor, solicite um novo link à agência.' 
  }), { status: 410, headers: corsHeaders });
}

if (approval.status === 'completed') return 410;
return 200 com payload sanitizado;
```

### `approval-decide` — `POST { token, task_id, decision, feedback? }`

Validação Zod (`feedback` ≤ 500 chars, obrigatório se `decision === 'revision'`).

**GUARDRAIL 3 — append atômico ao `tasks.history` (JSONB)**:

```ts
// Re-checar expiração também aqui
const { data: approval } = await admin.from('task_approvals')
  .select('id, expires_at, status').eq('token', token).maybeSingle();
if (!approval || new Date() > new Date(approval.expires_at) || approval.status === 'completed') 
  return 410;

// Fetch + append ao history (sem race: usa optimistic concurrency via updated_at)
const { data: task } = await admin.from('tasks').select('history, updated_at').eq('id', task_id).single();
const historyArr = Array.isArray(task.history) ? task.history : [];
const newEntry = {
  type: 'external_approval',
  decision,
  feedback: feedback ?? null,
  timestamp: new Date().toISOString(),
  user: 'Cliente',
};
const newHistory = [...historyArr, newEntry];

const updates = decision === 'approved'
  ? { status: 'approved', is_rejected: false, client_feedback: null, history: newHistory }
  : { status: 'em_revisao', is_rejected: true, client_feedback: feedback, history: newHistory };

await admin.from('tasks').update(updates).eq('id', task_id).eq('updated_at', task.updated_at);
await admin.from('task_approval_items').update({ decision, client_feedback: feedback, decided_at: new Date().toISOString() })
  .eq('approval_id', approval.id).eq('task_id', task_id);

// Recalcula status do approval (completed quando todos decididos)
```

Config em `supabase/config.toml`:
```toml
[functions.approval-get]
verify_jwt = false
[functions.approval-decide]
verify_jwt = false
```

## 3. Frontend

### `src/pages/PublicApproval.tsx` (rota `/approve/:token`)

- Estética 'Quiet Luxury': fundo `bg-neutral-50`, max-width contido, logo da agência no topo, tipografia generosa.
- **Tela de expiração (410)**: card centralizado com ícone `Clock`, título "Link expirado", mensagem do servidor, botão fantasma "Voltar ao site". Mesma tela para `completed`.
- Carousel shadcn quando `items.length > 1`; card único caso contrário.
- `<AttachmentsDisplay>` para arquivos.
- 2 botões: **Aprovar** (verde, confirmação rápida) e **Solicitar Ajuste** (âmbar — abre `Textarea maxLength={500}` com contador `0/500`).
- Após decidir, item bloqueia re-submissão e mostra estado.
- Toasts via `sonner`. `useMutation` local.

### `src/hooks/useCreateApprovalLink.ts` (novo)

Fluxo:
1. Busca outras tasks `client_id = X AND (status='em_revisao' OR is_rejected=true) AND id != current.id`.
2. Se >0 → AlertDialog "Detectamos N tarefa(s) também em revisão. Agrupar no mesmo link?".
3. INSERT em `task_approvals` (token = `crypto.randomUUID()`, `expires_at` = `now() + 15 days` — default do banco já cobre, mas explícito no insert para clareza).
4. INSERT em `task_approval_items` (batch).
5. UPDATE `is_rejected=false, client_feedback=null` nas tasks incluídas.
6. Copia `${origin}/approve/${token}` ao clipboard. Toast: "Link copiado — válido por 15 dias".
7. React Query optimistic update em `["tasks"]`.

### `src/components/ui/task-card.tsx`

Quando `is_rejected === true`:
- Badge `<Badge variant="destructive" className="mb-2">Rejeitado pelo Cliente</Badge>` no topo.
- Borda: trocar para `border-destructive/60` + `ring-1 ring-destructive/30`.

### `src/components/tasks/TaskDetailsDialog.tsx`

- **Alert de feedback** no topo quando `client_feedback`:
  ```tsx
  <Alert variant="destructive">
    <AlertCircle/><AlertTitle>Ajuste Solicitado pelo Cliente</AlertTitle>
    <AlertDescription>{client_feedback}</AlertDescription>
  </Alert>
  ```
- **Botão "Enviar para Aprovação"** (amarelo) no footer: `disabled` se sem anexo, tooltip explicativo.
- **GUARDRAIL 2 — Fail-Fast 10 MB**: no handler de upload de anexos desta área:
  ```ts
  const MAX = 10 * 1024 * 1024;
  for (const f of files) {
    if (f.size > MAX) {
      toast.error('O arquivo excede o limite de 10MB para links de aprovação.');
      return; // bloqueia ANTES de qualquer upload ao Storage
    }
  }
  ```
- Reset `is_rejected=false, client_feedback=null` nas tasks incluídas (executado pelo hook `useCreateApprovalLink`).

### `src/components/tasks/TaskStatusManager.tsx` + `src/hooks/useTaskStatuses.tsx`

- Adicionar status default `approved` (label "Aprovado", `order_position=3`, `done` passa para 4, `is_default=true`).
- Lógica de seed para agências existentes: ao carregar statuses, se `approved` não existir e `done` existir, inserir entre revisão e done e re-numerar.
- `is_default=true` já bloqueia exclusão (lógica existente).

### `src/App.tsx`

- Adicionar `<Route path="/approve/:token" element={<PublicApproval />} />` fora do `AppLayout`.

## 4. Atualização Otimista (React Query)

- Mutations de aprovação/reset usam `onMutate` para atualizar cache `["tasks"]`; `onError` rollback.
- Realtime de `tasks` cobre updates do servidor pós-decisão do cliente.

## Arquivos editados/criados

- **Migração SQL** — tabelas `task_approvals` (com `expires_at`), `task_approval_items`, colunas em `tasks`, RLS.
- `src/pages/PublicApproval.tsx` (novo) — página pública + tela elegante de link expirado.
- `src/hooks/useCreateApprovalLink.ts` (novo) — Smart Batch + `expires_at`.
- `src/components/ui/task-card.tsx` — badge + borda destructive.
- `src/components/tasks/TaskDetailsDialog.tsx` — Alert, botão enviar, validação fail-fast 10 MB.
- `src/components/tasks/TaskStatusManager.tsx` — seed `approved`.
- `src/hooks/useTaskStatuses.tsx` — defaults locais.
- `src/App.tsx` — rota pública.
- `supabase/functions/approval-get/index.ts` (nova) — checa `expires_at`, retorna 410.
- `supabase/functions/approval-decide/index.ts` (nova) — re-check expiração + append atômico no `history` JSONB.
- `supabase/config.toml` — `verify_jwt = false` para ambas funções.

## Sem mudanças

- Demais status do Kanban, fluxo de tasks/anexos em outras telas, autenticação — preservados.
- Nenhuma lib nova adicionada.

