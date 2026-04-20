

# Fix — Erro `is_recurring` ao duplicar tarefa

## Diagnóstico

**Erro:** `null value in column "is_recurring" of relation "tasks" violates not-null constraint`

A coluna `tasks.is_recurring` é `NOT NULL DEFAULT false`. O default só se aplica quando o campo é **omitido** do INSERT — ao enviar `undefined`, o PostgREST envia `null` e quebra.

### Causa raiz

`handleDuplicateTask` em `src/pages/Tasks.tsx` (linhas 1040-1068) faz `form.reset({...})` **sem** os campos de recorrência:
- `is_recurring`
- `recurrence_frequency`
- `recurrence_interval`
- `recurrence_days_of_week`
- `recurrence_end_at`

Como o reset não usa `defaultValues` por baixo, esses campos ficam `undefined`. Depois, no submit (linha 747), `is_recurring: newTask.is_recurring` vira `undefined` → `null` no insert → erro.

A criação normal funciona porque o form começa com os defaults do schema (linhas 159-163). O bug só aparece em **duplicar**.

## Mudança (apenas `src/pages/Tasks.tsx`)

### 1. Completar o `form.reset` em `handleDuplicateTask` (linhas 1043-1064)

Adicionar os campos de recorrência preservando os valores da tarefa original (caso ela seja recorrente, a cópia também será):

```ts
form.reset({
  // ...campos existentes...
  is_recurring: !!task.is_recurring,
  recurrence_frequency: (task.recurrence_rule?.frequency as RecurrenceFrequency) || "weekly",
  recurrence_interval: task.recurrence_rule?.interval || 1,
  recurrence_days_of_week: task.recurrence_rule?.daysOfWeek || [],
  recurrence_end_at: task.recurrence_rule?.endAt || "",
});
```

### 2. Defesa em profundidade no INSERT (linha 747)

Garantir que o valor enviado nunca seja `undefined`:

```ts
is_recurring: !!newTask.is_recurring,
```

Aplicar a mesma blindagem no UPDATE de edição (linha 935).

## Garantias

| # | Garantia |
|---|---|
| 1 | Duplicar tarefa não-recorrente → cria cópia com `is_recurring=false`. |
| 2 | Duplicar tarefa recorrente → cópia preserva regra e gera próxima ocorrência ao concluir. |
| 3 | Coerce `!!` no insert/update bloqueia regressões caso outro fluxo esqueça o campo. |
| 4 | Sem migrations. Sem mudança em schema, edges ou RLS. |

## Ficheiros alterados
- `src/pages/Tasks.tsx`

