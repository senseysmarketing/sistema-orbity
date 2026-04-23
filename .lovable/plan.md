

# Realtime para Kanbans de Tarefas e Leads (sem WAL bloat)

## 1. Migration SQL (mínima)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
```

Sem `REPLICA IDENTITY FULL` — o default já inclui a PK (`id`) em `payload.old`, suficiente para `DELETE` (filtrar por id) e `UPDATE` (substituir por id após refetch).

## 2. `src/pages/Tasks.tsx` — Realtime com joins consistentes

- Extrair a string de `select()` atual do `fetchTasks` para uma constante no topo do arquivo: `const TASK_QUERY_FIELDS = "..."` (mesma string, sem alteração de campos/joins).
- Refatorar `fetchTasks` para usar `TASK_QUERY_FIELDS`.
- Adicionar `useEffect` (após o `useEffect` do `fetchTasks`) com subscrição Realtime:
  - Canal: `tasks-realtime-${currentAgency.id}`
  - `on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: 'agency_id=eq.${currentAgency.id}' }, handler)`
  - Handler:
    - **INSERT**: `supabase.from('tasks').select(TASK_QUERY_FIELDS).eq('id', payload.new.id).maybeSingle()` → `setTasks(prev => prev.some(t => t.id === row.id) ? prev : [row, ...prev])` (idempotente contra optimismo local).
    - **UPDATE**: mesmo refetch individual → `setTasks(prev => prev.map(t => t.id === row.id ? row : t))`.
    - **DELETE**: `setTasks(prev => prev.filter(t => t.id !== payload.old.id))`.
  - Cleanup: `supabase.removeChannel(channel)`.
  - Dependência: `[currentAgency?.id]`.

Mantém `fetchTasks()` como fallback após mutações locais (não remover).

## 3. `src/pages/CRM.tsx` — sem mudanças

A subscrição Realtime para `leads` já existe e está correta. A migration ativa-a.

## Sem alterações

- UI/estética dos Kanbans, drag-and-drop, otimismo local, Meta events.
- Hooks de tasks/leads, edge functions, demais páginas.
- `REPLICA IDENTITY` (mantido como default).

## Arquivos editados

- `supabase/migrations/<timestamp>_realtime_tasks_leads.sql` — nova (2 linhas).
- `src/pages/Tasks.tsx` — extrair `TASK_QUERY_FIELDS` + adicionar `useEffect` Realtime.

## Resultado

- Multi-utilizador: cards movem-se ao vivo na tela de toda a agência.
- Sem WAL bloat — payload mínimo do Postgres, joins reidratados via select consistente.
- Zero flicker — patches granulares no `useState` local.

