

# Otimização extrema do Kanban de Leads (60fps)

## 1. `src/components/crm/LeadsKanban.tsx` — Hoisting de funções puras

Mover as 5 funções auxiliares para o **escopo do módulo** (topo do arquivo, fora do componente):

- `getPriorityColor(priority: string)`
- `getPriorityLabel(priority: string)`
- `formatCurrency(value: number)`
- `formatDate(date: string | null)`
- `getUrgencyLevel(lead: Lead)`

Como são puras (sem dependências de state/props), criar uma única vez no load do módulo. Remover qualquer `useCallback` redundante.

## 2. Auditoria de props inline no caminho até `SortableLeadCard`

Inspecionar `LeadsKanban` → `LeadKanbanColumn` → `SortableLeadCard` e garantir que **nenhuma prop funcional seja inline**:

- `onEdit`, `onDelete`, `onView`, `onScheduleMeeting` → estabilizar com `useCallback` no `LeadsKanban` (dependências mínimas: setters/mutations, que já são estáveis).
- Se algum handler atualmente faz `(lead) => openEdit(lead)` inline, refatorar para `useCallback((lead) => ...)`.
- `LeadKanbanColumn` deve repassar essas refs estáveis sem wrapping inline.

Sem isso, `memo` no card é inerte.

## 3. `src/components/crm/SortableLeadCard.tsx` — memo + GPU + useMemo

- `import { memo, useMemo } from "react"`
- Trocar `CSS.Transform.toString(transform)` → `CSS.Translate.toString(transform)` (ativa `translate3d` na GPU).
- Memoizar `currentStatusConfig` com `useMemo([statusConfig, displayStatus])`.
- Exportar como:
  ```ts
  export const SortableLeadCard = memo(function SortableLeadCard(props: SortableLeadCardProps) { ... });
  ```
  Mantém Fast Refresh com export nomeado.

## Sem alterações

- Estética, classes Tailwind, JSX, animações de hover, lógica WhatsApp/Reunião.
- `LeadKanbanColumn` (apenas verificar que não recria handlers inline ao repassar).
- Lógica de `handleDragEnd`, atualização otimista, Meta events.

## Arquivos editados

- `src/components/crm/LeadsKanban.tsx` — hoist de 5 funções puras + `useCallback` em handlers passados aos cards.
- `src/components/crm/SortableLeadCard.tsx` — `memo`, `CSS.Translate`, `useMemo` em `currentStatusConfig`.
- `src/components/crm/LeadKanbanColumn.tsx` — apenas se houver wrapping inline a corrigir (verificar e ajustar).

## Resultado

- Funções puras: zero alocação por render.
- Handlers estáveis + `memo`: cards não-arrastados não re-renderizam durante o drag.
- `CSS.Translate`: transform via GPU, libera CPU → 60fps consistentes.

