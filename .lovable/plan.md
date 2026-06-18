# Corrigir responsáveis aparecendo como "Não atribuída" no modal de detalhes

## Causa raiz

No `src/pages/Tasks.tsx`, o `getAssignedUsers(taskId)` retorna uma lista de objetos `AssignedUser` já achatados, no formato:

```ts
{ id, user_id, name, role }
```

Mas em `src/components/tasks/TaskDetailsDialog.tsx` (linha ~524), o componente faz:

```tsx
<TaskAssignedUsers users={assignedUsers.map(a => a.profiles)} showNames />
```

Esse `.map(a => a.profiles)` é resquício do formato antigo do join (`task_assignments` com nested `profiles`). Como agora os objetos já são achatados, `a.profiles` é `undefined`. O `TaskAssignedUsers` então filtra tudo (`u && u.name`), cai no caso vazio e renderiza **"Não atribuída"**.

Os cards na lista/kanban continuam corretos porque consomem a lista achatada diretamente, sem `.profiles`.

## Correção

**Arquivo:** `src/components/tasks/TaskDetailsDialog.tsx`

1. Trocar `users={assignedUsers.map(a => a.profiles)}` por `users={assignedUsers}` (os itens já estão no shape esperado por `TaskAssignedUsers`).
2. Defensivamente, manter um fallback caso algum item ainda venha no formato antigo:
   ```tsx
   users={assignedUsers.map((a: any) => a?.profiles ?? a)}
   ```
   Isso garante compatibilidade com qualquer chamador (ex.: `SocialMediaCalendar`, `WeeklyPlanningView`) sem regressão.

Nenhuma outra alteração necessária — backend, hooks e RLS estão corretos; é apenas o mapeamento no dialog.

## Verificação

- Abrir uma tarefa com responsáveis atribuídos (ex.: "Corte de Podcast - GPS Negócios Imobiliários") → seção **Responsáveis** deve listar os avatares e nomes (ex.: "Carol").
- Abrir uma tarefa sem responsáveis → continua exibindo "Não atribuída".
- Cards na lista/kanban permanecem inalterados.
