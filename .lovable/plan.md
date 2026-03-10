

# Refatoracao Completa: Sistema de Atribuicoes de Tarefas

## Diagnostico Real

**Banco de dados**: Correto. A tarefa "Criacao de Criativos de Alto Padrao - Empreendimento Ilha Pura (ABRIL)" tem Carol atribuida no banco. Giovanna nao esta atribuida a essa tarefa no banco (a atribuicao nunca persiste). As 6 tarefas sem atribuicao no banco tambem nao tem `assigned_to` legado preenchido.

**Problema confirmado**: O `useTaskAssignments` hook mantem cache global de ~1050 atribuicoes. Quando `assignUsersToTask` faz DELETE+INSERT, o realtime listener e o custom event `task-assignments-updated` no `Tasks.tsx` (linha 207-215) disparam refetches simultaneos que competem com a UI otimista, causando flickering e perda de dados visuais.

**Evidencia**: Dashboard (`Index.tsx`) e Social Media (`useSocialMediaTasks.tsx`) fazem join inline `task_assignments(user_id)` e funcionam perfeitamente. So o modulo Tasks usa o hook quebrado.

## Plano de Implementacao

### 1. Reescrever `src/hooks/useTaskAssignments.tsx` (mutation-only)

Remover completamente: estado global `assignments`, realtime listener, custom event, `fetchAssignments`, `getAssignedUsers`, `getTasksForUser`.

Manter apenas:
- `assignUsersToTask(taskId, userIds)` → DELETE + INSERT, retorna `Promise<boolean>`
- `removeUserFromTask(taskId, userId)` → DELETE, retorna `Promise<boolean>`

Sem estado local, sem realtime, sem cache.

### 2. Refatorar `src/pages/Tasks.tsx`

- `fetchTasks`: mudar query para `select('*, task_clients(client_id), task_assignments(user_id)')` 
- Apos fetch, extrair todos `user_id` unicos, buscar profiles em batch
- Enriquecer cada task com propriedade `_assignedUsers: [{user_id, name, role}]`
- Criar funcao local `getAssignedUsers(taskId)` que le de `tasks.find(t => t.id === taskId)?._assignedUsers`
- `handleCreateTask` / `handleUpdateTask`: apos `assignUsersToTask`, chamar `fetchTasks()` para refresh unico
- `handleEditTask`: ler `_assignedUsers` da task em vez de chamar `getAssignedUsers` do hook
- Remover: import `useTaskAssignments` (manter so `assignUsersToTask`), event listener `task-assignments-updated`, `fetchAssignments()` do useEffect

### 3. Ajustar componentes que recebem `getAssignedUsers`

- `KanbanColumn` (linha 98): ja recebe `getAssignedUsers` como prop — nenhuma mudanca na interface, so a funcao passada muda
- `TaskDetailsDialog` (linha 176): ja recebe `getAssignedUsers` como prop — mesma coisa
- `TaskAnalytics` (linha 1588): ja busca dados via join proprio — nenhuma mudanca

### 4. Nenhuma mudanca em outros modulos

- `Index.tsx`: ja usa join inline — OK
- `useSocialMediaTasks.tsx`: ja usa join inline — OK
- `SocialMediaAnalytics.tsx`: ja usa join inline — OK
- `TaskAnalytics.tsx`: ja usa join inline — OK

### Arquivos alterados
1. `src/hooks/useTaskAssignments.tsx` — reescrita (~40 linhas vs ~256)
2. `src/pages/Tasks.tsx` — refatorar fetchTasks + remover dependencia do cache

