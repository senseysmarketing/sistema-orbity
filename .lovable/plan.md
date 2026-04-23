

# Filtro de Ordenação — "Últimas alterações" como opção extra

## Comportamento

Padrão **continua** sendo ordenação por **Data de Entrega (mais próxima primeiro)** — comportamento atual intacto. O novo controle adiciona apenas uma opção momentânea para reordenar quando o usuário quiser.

Novo `<Select>` "Ordenar" na barra de filtros de `/dashboard/tasks` com 2 opções:

- **Data de entrega** (padrão) — `due_date ASC` (comportamento atual, sem mudança)
- **Últimas alterações** — `updated_at DESC` (puxa as tarefas movimentadas/editadas mais recentemente)

## Implementação

### 1. Estado e UI

Em `src/pages/Tasks.tsx`:
- Novo estado `sortBy` (`'due_date' | 'recent'`), padrão `'due_date'`.
- Novo `<Select>` "Ordenar" na linha de filtros, mesmo padrão visual dos demais (Prioridade, Usuário, Cliente, Tipo, Período).

### 2. Query Supabase

Garantir que `updated_at` está no `select` da query principal de `tasks` (coluna já existe e é atualizada por trigger em qualquer UPDATE — mudança de status, atribuição, edição).

### 3. Lógica de ordenação

```ts
const sortedTasks = useMemo(() => {
  const arr = [...filteredTasks];
  if (sortBy === 'recent') {
    return arr.sort((a,b) => +new Date(b.updated_at) - +new Date(a.updated_at));
  }
  // padrão: due_date asc (mantém comportamento atual)
  return arr.sort((a,b) => (a.due_date ? +new Date(a.due_date) : Infinity) - (b.due_date ? +new Date(b.due_date) : Infinity));
}, [filteredTasks, sortBy]);
```

### 4. Compatibilidade Lista/Kanban

`TaskListView` recebe prop `sortBy`. Quando `'due_date'`, mantém o sort interno atual de cada grupo (sem mudança visual). Quando `'recent'`, ordena por `updated_at DESC` dentro de cada grupo de status. Kanban segue a mesma lógica por coluna.

## Arquivos editados

- `src/pages/Tasks.tsx` — `<Select>` de ordenação + estado + `useMemo` + passar `sortBy` para Lista/Kanban.
- `src/components/tasks/TaskListView.tsx` — receber `sortBy` e aplicar no sort interno por grupo (mantendo o comportamento atual quando `'due_date'`).
- Componente Kanban da página — receber `sortBy` e aplicar na ordem das colunas.
- Query de tasks — incluir `updated_at` no select se ainda não estiver.

## Sem mudanças

- Comportamento padrão de ordenação (data de entrega) — preservado.
- Filtros existentes (Prioridade, Usuário, Cliente, Tipo, Período) — intactos.
- Schema do banco, demais telas (Meu Dia, tarefas solicitadas) — não afetadas.

