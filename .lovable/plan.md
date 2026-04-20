

# Tarefas Recorrentes — RPC atómica + datas inteligentes

## 1. Migração SQL (schema + RPC)

```sql
-- Colunas de recorrência
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule JSONB;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS next_occurrence_generated BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_parent ON public.tasks(recurrence_parent_id);

-- RPC atómica
CREATE OR REPLACE FUNCTION public.generate_next_recurring_task(
  p_task_id UUID,
  p_next_due_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orig public.tasks%ROWTYPE;
  v_new_id UUID;
  v_parent_id UUID;
  v_subtasks JSONB;
BEGIN
  SELECT * INTO v_orig FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task % not found', p_task_id; END IF;
  IF v_orig.next_occurrence_generated THEN RETURN NULL; END IF;
  IF NOT COALESCE(v_orig.is_recurring, false) THEN RETURN NULL; END IF;

  v_parent_id := COALESCE(v_orig.recurrence_parent_id, v_orig.id);

  -- Reset subtasks completed=false
  IF v_orig.subtasks IS NOT NULL THEN
    SELECT jsonb_agg(jsonb_set(elem, '{completed}', 'false'::jsonb))
      INTO v_subtasks
      FROM jsonb_array_elements(v_orig.subtasks) elem;
  END IF;

  -- Clone task
  INSERT INTO public.tasks (
    title, description, priority, status, due_date, agency_id, client_id, is_internal,
    task_type, platform, post_type, hashtags, creative_instructions, subtasks,
    is_recurring, recurrence_rule, recurrence_parent_id, next_occurrence_generated,
    created_by
  ) VALUES (
    v_orig.title, v_orig.description, v_orig.priority, 'todo', p_next_due_date,
    v_orig.agency_id, v_orig.client_id, v_orig.is_internal,
    v_orig.task_type, v_orig.platform, v_orig.post_type, v_orig.hashtags, v_orig.creative_instructions,
    COALESCE(v_subtasks, v_orig.subtasks),
    true, v_orig.recurrence_rule, v_parent_id, false,
    v_orig.created_by
  ) RETURNING id INTO v_new_id;

  -- Clone assignments
  INSERT INTO public.task_assignments (task_id, user_id, assigned_by)
  SELECT v_new_id, user_id, assigned_by FROM public.task_assignments WHERE task_id = p_task_id;

  -- Clone clients (multi-cliente)
  INSERT INTO public.task_clients (task_id, client_id)
  SELECT v_new_id, client_id FROM public.task_clients WHERE task_id = p_task_id;

  -- Marca original
  UPDATE public.tasks SET next_occurrence_generated = true WHERE id = p_task_id;

  RETURN v_new_id;
END;
$$;
```

> Ajustes de colunas (ex.: presença real de `subtasks`, `task_clients`, `platform`, etc.) serão validados via `security--get_table_schema` antes de gravar a migration final.

## 2. Helper — `src/lib/recurrence.ts` (novo)

```ts
export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0=Dom..6=Sáb (weekly)
  endAt?: string;        // ISO date
};

export function computeNextDueDate(currentDue: string, rule: RecurrenceRule): string {
  // Itera (addDays/addWeeks/addMonths conforme freq) até next >= hoje (00:00)
  // Para weekly+daysOfWeek: avança dia a dia respeitando interval semanal
  // Retorna 'YYYY-MM-DD'
}
```

**Anti-Overdue**: loop garante `next >= startOfToday()`. Se `endAt` definido e ultrapassado → retorna `null` (caller não chama RPC e apenas marca `next_occurrence_generated=true`).

## 3. UI de criação/edição — `src/pages/Tasks.tsx`

Componente local `RecurrenceFields` reutilizado nos dialogs de criar/editar:
- `<Switch>` "Tarefa Recorrente".
- Quando ativo (card `bg-muted/50` `space-y-3`):
  - `Select` Frequência (Diária/Semanal/Mensal).
  - `Input number` Intervalo ("Repetir a cada X").
  - Se `weekly`: 7 badges toggleáveis (D S T Q Q S S).
- Persiste em `is_recurring` + `recurrence_rule` (JSONB).

## 4. Integração handleDragEnd + handleUpdateTask

Padrão **rollback visual** quando status vira `done`:

```ts
if (newStatus === 'done' && task.is_recurring && !task.next_occurrence_generated && task.due_date && task.recurrence_rule) {
  const nextDue = computeNextDueDate(task.due_date, task.recurrence_rule);
  if (nextDue) {
    const { error } = await supabase.rpc('generate_next_recurring_task', {
      p_task_id: task.id,
      p_next_due_date: nextDue,
    });
    if (error) {
      // Rollback: reverte status local + toast erro, NÃO marca done
      revertOptimisticUpdate();
      toast({ title: 'Falha ao gerar próxima ocorrência', variant: 'destructive' });
      return;
    }
    toast({ title: '🔁 Próxima ocorrência criada', description: formatBR(nextDue) });
  }
}
```

A atualização do status para `done` em si continua via `update tasks`. RPC é chamada **após** sucesso do update; se RPC falhar, revertemos status (segundo update) + UI.

## 5. Banner + parar recorrência — `TaskDetailsDialog.tsx`

- Se `task.is_recurring`: card sutil topo `🔁 Esta é uma tarefa recorrente · [resumo legível]` + botão `Parar Recorrência` (com `AlertDialog`).
- Ação: `update tasks set is_recurring=false, next_occurrence_generated=true where (id = current OR recurrence_parent_id = current.parent_id ?? current.id) and status != 'done'`.

## 6. Ícone no card — `src/components/ui/task-card.tsx`

- Importar `RotateCw` (lucide). Render ao lado do `<h3>` quando `task.is_recurring`.
- Estender interface `Task` local com `is_recurring?: boolean`.

## 7. Selects/Interfaces

Adicionar `is_recurring, recurrence_rule, recurrence_parent_id, next_occurrence_generated` ao `selectFields` e à interface `Task` em `Tasks.tsx`. Propagar para `TaskDetailsDialog`.

## Guardrails

| # | Garantia |
|---|---|
| 1 | **Atomicidade**: clone task + assignments + clients + subtasks reset numa única RPC. |
| 2 | **Anti-Overdue**: `computeNextDueDate` itera até `next >= hoje`. |
| 3 | **Rollback visual**: se RPC falha, status não fica `done`. |
| 4 | **Sem duplicação**: `next_occurrence_generated` + `FOR UPDATE` previnem race. |
| 5 | **endAt**: ciclo encerra silenciosamente. |
| 6 | **Parar recorrência cascata** via `recurrence_parent_id`. |
| 7 | **Subtasks resetadas** dentro da RPC (integridade relacional). |

## Ficheiros alterados
- **Migration** — colunas em `tasks` + função `generate_next_recurring_task`.
- **Novo**: `src/lib/recurrence.ts`.
- `src/pages/Tasks.tsx` (form fields, handleCreateTask, handleUpdateTask, handleDragEnd, selectFields, interface Task).
- `src/components/tasks/TaskDetailsDialog.tsx` (banner + Parar Recorrência).
- `src/components/ui/task-card.tsx` (ícone RotateCw).

Sem edge functions. Sem novas secrets.

