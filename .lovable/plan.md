
# Correção: Progresso do Dia no Dashboard

## Problema

A barra de progresso mostra "39 de 41 tarefas de hoje concluídas", mas o número 41 está incorreto.

O cálculo atual é:
```
todayTasksTotal = todayTasks.length + doneTodayTasks.length
```

Onde:
- `todayTasks` = tarefas com `due_date = hoje` e `status !== 'done'` ✅
- `doneTodayTasks` = tarefas com `status = 'done'` e `updated_at = hoje` ❌

O problema está em `doneTodayTasks`: ela captura **todas** as tarefas concluídas hoje, independente da data de vencimento. Então o usuário que concluiu 39 tarefas antigas hoje, todas entram na conta — inflacionando o total para 41.

## Solução

Substituir `doneTodayTasks` por uma versão que filtra apenas tarefas com `due_date = hoje` que já foram concluídas:

```typescript
// ANTES (errado) — pega tudo que foi concluído HOJE
const doneTodayTasks = myTasks.filter(t => {
  if (t.status !== 'done' || !t.updated_at) return false;
  return isToday(new Date(t.updated_at));
});

// DEPOIS (correto) — pega só o que foi concluído E vence HOJE
const doneTodayTasks = myTasks.filter(t => {
  if (t.status !== 'done' || !t.due_date) return false;
  return isToday(new Date(t.due_date));
});
```

Com isso:
- `todayTasksTotal` = tarefas pendentes hoje + tarefas concluídas que vencem hoje
- `todayTasksDone` = tarefas concluídas que vencem hoje

## Arquivo a Modificar

`src/pages/Index.tsx` — linha 228 a 231

## Resultado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Usuário com 2 tarefas hoje e 39 antigas concluídas | "39 de 41 concluídas" (errado) | "0 de 2 concluídas" (correto) |
| Usuário conclui 1 das 2 tarefas de hoje | "40 de 41 concluídas" (errado) | "1 de 2 concluídas" (correto) |

A barra passará a refletir somente o progresso do dia atual do usuário, não o histórico geral de conclusões.
