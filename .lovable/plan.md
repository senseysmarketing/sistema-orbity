

# Vista em Lista nas Tarefas — versão final aprovada com 3 guardrails

## 1. Toggle e estado (`src/pages/Tasks.tsx`)

- `const [view, setView] = useState<'kanban' | 'list'>('kanban')` com persistência em `localStorage` (`tasks:view:${currentAgency.id}`).
- `ToggleGroup` (size sm, variant outline) no fim da linha de filtros, com itens `LayoutDashboard` (Kanban) e `List` (Lista).
- Render condicional: `{view === 'kanban' ? <DndContext.../> : <TaskListView .../>}` — mesmo `filteredTasks`, mesmos handlers.

## 2. Novo componente `src/components/tasks/TaskListView.tsx`

Wrapper `<div className="rounded-md border bg-card">` envolvendo um único `<Accordion type="multiple" defaultValue={...}>`.

### Guardrail 1 — Accordion por status
- Para cada `status` em `statuses`: um `<AccordionItem value={status.slug}>`.
- `defaultValue` = todos os slugs **exceto** `'done'` (concluído nasce colapsado).
- `<AccordionTrigger>` customizado: borda lateral esquerda 4px com `status.color`, exibe nome em uppercase tracking-wide + contador `({n})`. Sem underline no hover.
- `<AccordionContent>`: container `overflow-x-auto` envolvendo a `<Table>` daquele grupo.
- Grupos com 0 tarefas após filtros são ocultados.

### Guardrail 2 — Ordenação inteligente
Dentro de cada grupo, ordenar por:
1. `due_date` ascendente (sem data → final).
2. Desempate por prioridade: `urgent (4) > high (3) > medium (2) > low (1) > sem prioridade (0)`.

```ts
const priorityRank = { urgent: 4, high: 3, medium: 2, low: 1 };
const sorted = [...groupTasks].sort((a, b) => {
  const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
  const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
  if (da !== db) return da - db;
  return (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0);
});
```

### Guardrail 3 — Densidade e responsividade
- `<Table>` envolto em `<div className="overflow-x-auto">`.
- Todas as `<TableCell>` recebem `whitespace-nowrap`.
- Tipografia `text-xs`; título em `text-sm font-normal`. Linhas `h-10`, `border-b border-border/40`. Hover `hover:bg-muted/40 cursor-pointer`.
- Tarefa concluída → `opacity-60 line-through` apenas no título.

### Colunas

| # | Coluna | Largura | Conteúdo |
|---|---|---|---|
| 1 | Checkbox | 32px | `checked={task.status==='done'}` → `onToggleComplete(task)` (stopPropagation) |
| 2 | Tipo | 28px | `getTypeIcon(task.task_type)` |
| 3 | Título | flex | `task.title` (clique → `onViewDetails`); ícone `RotateCw` h-3 ml-1 se `is_recurring` |
| 4 | Cliente | 160px | Badge `variant="secondary"` truncate com `getClientName(client_id)` |
| 5 | Responsáveis | auto | **1 user** → Avatar h-6 w-6 + primeiro nome. **2+** → stack sobreposta (`-ml-2`) até 3, `+N` se exceder |
| 6 | Prioridade | 80px | `Flag` lucide com `getPriorityColor` + label sm:visível |
| 7 | Entrega | 110px | `formatDateBR(due_date)`; `text-destructive` se vencida e não concluída; "—" se ausente |
| 8 | Ações | 32px | `DropdownMenu` (`MoreHorizontal`): "Editar" → `onEdit`, "Excluir" (destructive) → `onDelete` |

### Props
```ts
{
  tasks, statuses, profiles, clients,
  getAssignedUsers, getClientName, getTypeIcon, getTypeShortName,
  getPriorityColor, getPriorityLabel, formatDateBR,
  onViewDetails, onEdit, onDelete, onToggleComplete
}
```

## 3. Integração em `Tasks.tsx`

- Imports: `List`, `LayoutDashboard` (lucide), `ToggleGroup/Item`, `TaskListView`.
- `onToggleComplete` chama a mesma mutação já usada para mudança de status no Kanban (mantendo paridade — sem nova rota de dados).
- Filtros (busca, prioridade, usuário, cliente, tipo, período) inalterados — `filteredTasks` é a fonte única.
- DnD permanece exclusivo do Kanban.

## Sem mudanças

- `KanbanColumn`, `SortableTaskCard`, hooks (`useTaskAssignments`, `useTaskStatuses`), schema, RLS, Edge Functions.
- Abas Análises/Configurações intactas.

## Arquivos

- **Novo:** `src/components/tasks/TaskListView.tsx`
- **Editado:** `src/pages/Tasks.tsx`

