

# Fix: Internal Agency Tasks — Layout, Display, and Filter Issues

## Problems Identified

1. **Modal layout**: The "Clientes" and "Atribuir usuários" fields use `grid-cols-2` (line 1264), causing them to stack/overlap on narrower screens. Should stack vertically.

2. **Task card shows "Sem cliente"**: When a task is created with `is_internal = true`, `client_id` is stored as `null`. The `getClientName` function does accept a `task` parameter to check `is_internal`, but the type signature through the component chain (`KanbanColumn` → `SortableTaskCard` → `TaskCard`) only passes `(clientId: string | null) => string` — the task object is never forwarded, so the internal check never runs.

3. **Client badge blank**: Same root cause — `getClientName` returns "Sem cliente" with the default muted color since `client_id` is null and `is_internal` is not checked.

4. **Filter doesn't match internal tasks**: The client filter (line 342-347) checks `task.client_id` against selected filter values. Internal tasks have `client_id = null`, so filtering by the virtual agency ID (`agency:xxx`) never matches. Also, internal tasks fall into "no-client" bucket incorrectly.

## Changes

### 1. Fix modal layout (`Tasks.tsx` ~line 1264)
Change `grid grid-cols-2 gap-4` to `grid gap-4` so Clientes and Atribuir usuários stack vertically, avoiding overlap.

### 2. Thread `task` object through card chain
Update the `getClientName` type signature in `KanbanColumn`, `SortableTaskCard`, and `TaskCard` interfaces from `(clientId: string | null) => string` to `(clientId: string | null, task?: any) => string`. Pass the task object when calling `getClientName` in `TaskCard`.

### 3. Fix client filter for internal tasks (`Tasks.tsx` ~line 342-347)
Add logic: if filtering by the virtual agency ID, match tasks where `is_internal === true`. This ensures internal tasks appear when the agency is selected in the filter.

## Files

| File | Change |
|------|--------|
| `src/pages/Tasks.tsx` | Fix grid layout (line 1264); fix filter logic (line 342-347) |
| `src/components/ui/kanban-column.tsx` | Update `getClientName` signature; pass task to call |
| `src/components/ui/sortable-task-card.tsx` | Update `getClientName` signature; pass task to call |
| `src/components/ui/task-card.tsx` | Update `getClientName` signature; pass task in render |

