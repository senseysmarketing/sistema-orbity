
# Plano Final — Links de Aprovação Únicos & Auto-destrutivos

Implementação em 4 etapas com os 2 guardrails aprovados pelo usuário.

## Etapa 1 — Migration (DB Schema)

```sql
-- 1.1) Garantir coluna expires_at com default 7 dias
ALTER TABLE public.task_approvals 
  ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

-- 1.2) GUARDRAIL #2 — Recriar FK com CASCADE explícito
ALTER TABLE public.task_approval_items 
  DROP CONSTRAINT IF EXISTS task_approval_items_approval_id_fkey;

ALTER TABLE public.task_approval_items 
  ADD CONSTRAINT task_approval_items_approval_id_fkey 
  FOREIGN KEY (approval_id) 
  REFERENCES public.task_approvals(id) 
  ON DELETE CASCADE;

-- 1.3) Índices de performance para reuso e GC
CREATE INDEX IF NOT EXISTS idx_task_approval_items_task_lookup 
  ON public.task_approval_items(task_id, approval_id);

CREATE INDEX IF NOT EXISTS idx_task_approvals_active_lookup
  ON public.task_approvals(agency_id, status, expires_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_task_approvals_gc 
  ON public.task_approvals(expires_at);
```

## Etapa 2 — Refatorar `useCreateApprovalLink.ts`

Lógica de **match perfeito + buffer de 48h** antes de criar novo link:

```ts
// GUARDRAIL #1 — só reaproveita se restar ≥ 48h de vida útil
const minViableExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

// 1) Buscar approvals 'pending' da agência cujo expires_at > now + 48h
//    e que contenham EXATAMENTE o mesmo conjunto de task_ids (match perfeito)
const { data: candidates } = await supabase
  .from("task_approvals")
  .select("id, token, expires_at, items:task_approval_items(task_id)")
  .eq("agency_id", currentAgency.id)
  .eq("status", "pending")
  .gt("expires_at", minViableExpiry);

// 2) Filtrar no client por match exato de conjunto (mesmo length + mesmas tasks)
const sortedRequested = [...taskIds].sort().join(",");
const reusable = (candidates ?? []).find((c: any) => {
  const ids = (c.items ?? []).map((i: any) => i.task_id).sort().join(",");
  return ids === sortedRequested;
});

// 3) Se houver, retorna o mesmo link e copia para clipboard
if (reusable) {
  const url = `${window.location.origin}/approve/${reusable.token}`;
  await navigator.clipboard.writeText(url);
  toast.success("Link existente reaproveitado.", {
    description: `Válido até ${new Date(reusable.expires_at).toLocaleDateString('pt-BR')}`,
  });
  return { url, token: reusable.token, expiresAt: reusable.expires_at, taskIds };
}

// 4) Caso contrário, segue o fluxo normal de criação com expires_at = NOW + 7 dias
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
// ... insert task_approvals + task_approval_items ...
```

**Mudança chave:** constante `FIFTEEN_DAYS_MS` → `SEVEN_DAYS_MS`. Toast atualizado para "válido por 7 dias".

## Etapa 3 — Tela de Expirado (`PublicApproval.tsx`)

A `approval-get` já retorna 410 com `error: "expired"`. Verificar se a tela de expirado usa o tema escuro Quiet Luxury:

- Fundo `bg-gradient-to-br from-zinc-950 via-black to-zinc-950`
- Card central `bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl`
- Ícone `Clock` ou `ShieldAlert` em `text-white/40`
- Mensagem: **"Este link de aprovação expirou por segurança. Solicite um novo link à sua agência."**
- Sub-texto suave com nome/contato da agência (se vier no payload, ou texto genérico)

Se o estado já existir mas com tema claro, refatorar mantendo a mesma estética dos outros estados (loading/completed).

## Etapa 4 — Garbage Collector (`storage-garbage-collector/index.ts`)

Adicionar bloco no FINAL da função, **após** a limpeza de attachments:

```ts
// === Limpeza física de links de aprovação expirados há > 15 dias ===
// (CASCADE blindado pela migration → task_approval_items são apagados juntos)
const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
const { error: approvalsErr, count: approvalsDeleted } = await supabase
  .from("task_approvals")
  .delete({ count: "exact" })
  .lt("expires_at", cutoff);

if (approvalsErr) {
  console.error("approval cleanup error:", approvalsErr);
} else {
  console.log(`Approval links physically deleted: ${approvalsDeleted ?? 0}`);
}

// Incluir no result final:
const result = { 
  tasks_processed: tasksProcessed, 
  files_deleted: filesDeleted, 
  files_preserved: filesPreserved,
  approval_links_deleted: approvalsDeleted ?? 0,
};
```

## Etapa 5 — Deploy & Validação

- Deploy de `storage-garbage-collector` (a `approval-get` não muda; já trata `expired` corretamente).
- Smoke test via SQL: verificar default `expires_at` aplicado em novo insert.
- Confirmar via `\d+ task_approval_items` que a FK aparece com `ON DELETE CASCADE`.

## Arquivos impactados

1. **Nova migration** — schema + FK CASCADE + índices
2. **`src/hooks/useCreateApprovalLink.ts`** — buffer 48h + match perfeito + 7 dias
3. **`src/pages/PublicApproval.tsx`** — refinar tela "expired" Quiet Luxury (se necessário)
4. **`supabase/functions/storage-garbage-collector/index.ts`** — bloco de limpeza física

## Resultado esperado

- ✅ DB minúscula: 1 tarefa = 1 link ativo
- ✅ Cliente sempre recebe link com ≥ 48h de uso garantido
- ✅ Links morrem sozinhos após 7 dias (segurança/IP)
- ✅ GC limpa fisicamente após 15 dias sem risco de FK violation
