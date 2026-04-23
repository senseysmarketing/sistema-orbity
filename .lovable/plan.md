

# Approval Suite — Guardrail de Status + Redeploy das Edge Functions

## Problemas

1. **Link público quebra ao acessar**: as Edge Functions `approval-get` e `approval-decide` retornam **404 NOT_FOUND**. Foram criadas mas não foram deployadas com sucesso. Por isso a página `/approve/:token` falha ao buscar dados.
2. **Falta de guardrail de status**: o botão "Enviar para Aprovação" só valida se há anexos. Mesmo com a tarefa em "A Fazer" (como no screenshot), o link é gerado. Conceitualmente, só faz sentido enviar tarefas que estão em **Em Revisão** (pronta para o cliente avaliar).

## Solução

### 1. Redeploy das Edge Functions

Forçar redeploy de `approval-get` e `approval-decide` (sem alterações de código — apenas garantir que ficam disponíveis no runtime).

### 2. Guardrail de status no `TaskDetailsDialog.tsx`

No fluxo `handleSendForApproval`, **antes** de checar anexos:

- Se `localTask.status !== "em_revisao"` → abrir um novo `AlertDialog` (`showMoveToReviewDialog`) com o título **"Mover para Em Revisão?"** e a descrição:
  > "Para enviar uma tarefa para aprovação do cliente, ela precisa estar na coluna **Em Revisão**. Deseja mover esta tarefa agora e continuar?"
- Botões:
  - **Cancelar** — fecha o modal, nada acontece.
  - **Mover e Continuar** (primary) — atualiza `tasks.status = 'em_revisao'` no Supabase, atualiza `localTask` localmente, chama `onTaskUpdate?.()` para refletir no Kanban via React Query, e em seguida segue o fluxo normal (validar anexos → checar batch candidates → criar link).

### 3. Refator mínimo do fluxo

```ts
const handleSendForApproval = async () => {
  if (!localTask) return;
  if (localTask.status !== "em_revisao") {
    setShowMoveToReviewDialog(true);
    return;
  }
  await proceedWithApproval();
};

const proceedWithApproval = async () => {
  // validações de anexo + batch + createLink (lógica atual extraída)
};

const handleMoveToReviewAndContinue = async () => {
  const { error } = await supabase
    .from("tasks")
    .update({ status: "em_revisao" })
    .eq("id", localTask!.id);
  if (error) { toast({ title: "Erro ao mover tarefa", variant: "destructive" }); return; }
  setLocalTask({ ...localTask!, status: "em_revisao" });
  onTaskUpdate?.();
  setShowMoveToReviewDialog(false);
  await proceedWithApproval();
};
```

### 4. Tooltip do botão atualizado

Trocar a mensagem do `Tooltip` para refletir os dois requisitos: "A tarefa precisa estar em **Em Revisão** e ter pelo menos um anexo." (mantém o botão clicável — o modal de confirmação cuida do guardrail).

## Arquivos editados

- `src/components/tasks/TaskDetailsDialog.tsx` — novo `AlertDialog`, refator do `handleSendForApproval`, tooltip atualizado.
- `supabase/functions/approval-get/index.ts` — redeploy (sem mudança de código).
- `supabase/functions/approval-decide/index.ts` — redeploy (sem mudança de código).

## Sem mudanças

- Schema do banco — preservado.
- Lógica de Smart Batch, validação de 10 MB, Alert de feedback, link público — preservados.
- Demais status do Kanban — preservados.

