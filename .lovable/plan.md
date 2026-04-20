

# Calendário Social — corrigir filtro "Agência (Interno)" + garantir clique no post

## Diagnóstico

### Problema 1 — Filtro "Agência (Interno)" mostra posts errados
A tabela `tasks` tem a coluna explícita **`is_internal: boolean`** (igual às tarefas e reuniões). O hook `useSocialMediaTasks` **não seleciona esse campo**, então o calendário usa o proxy `!task.client_id` para identificar posts internos.

Isso gera 2 falhas:
1. **Falsos positivos**: qualquer post de cliente real que ainda não tenha vínculo em `task_clients` aparece como "interno".
2. **Falsos negativos**: post marcado como interno mas com cliente associado (cenário válido — `is_internal=true` + `client_id`) é tratado como cliente normal.

A tela de Tarefas (`src/pages/Tasks.tsx` linhas 531-533) já usa o critério correto: `task.is_internal` para o filtro virtual e `!task.client_id && !task.is_internal` para "sem cliente".

### Problema 2 — Clique no post
O handler `handleTaskClick` e o `TaskDetailsDialog` já existem. Vou apenas garantir que `is_internal` é propagado para o dialog e que o clique funciona consistentemente em todas as views (mês/semana/dia).

## Mudanças

### 1. `src/hooks/useSocialMediaTasks.tsx`
- Adicionar `is_internal: boolean` à interface `SocialMediaTask`.
- Incluir `is_internal` no `select(...)` da query de `tasks`.
- Mapear no objeto retornado: `is_internal: task.is_internal || false`.

### 2. `src/components/social-media/SocialMediaCalendar.tsx`
Substituir a heurística por `is_internal`:

```ts
const hasAgencyFilter = clientFilter.some(isVirtualAgencyClient);
const realClientFilter = clientFilter.filter(id => !isVirtualAgencyClient(id));

const matchesClient =
  clientFilter.length === 0 ||
  (hasAgencyFilter && task.is_internal) ||
  (!!task.client_id && realClientFilter.includes(task.client_id));
```

Bônus de UX: exibir o nome correto no card quando `is_internal` for true (mostrar "{Agência} (Interno)" no `client_name`).

### 3. Clique no post — garantir que abre o dialog
- Manter o handler atual em `CompactTaskCard` (mês e semana).
- O `TaskDetailsDialog` já é renderizado ao final. Apenas validar que `selectedTask` recebe `is_internal` (agora propagado pelo hook) para o título mostrar corretamente.

## Garantias

| # | Garantia |
|---|---|
| 1 | Filtro "Agência (Interno)" usa `is_internal=true` (fonte da verdade), não mais `!client_id`. |
| 2 | Posts de cliente real sem `task_clients` deixam de aparecer no filtro interno. |
| 3 | Posts internos com cliente associado aparecem corretamente no filtro interno. |
| 4 | Clique em qualquer card de post (mês/semana/dia/popover) abre o `TaskDetailsDialog`. |
| 5 | Sem migrations — coluna `is_internal` já existe em `tasks`. |

## Ficheiros alterados
- `src/hooks/useSocialMediaTasks.tsx`
- `src/components/social-media/SocialMediaCalendar.tsx`

