

# DnD Trello-style com Mouse + Touch sensors separados

## Mudanças

### 1. `src/components/crm/LeadsKanban.tsx`
Substituir import e bloco `useSensors`:
```tsx
import { ..., MouseSensor, TouchSensor } from '@dnd-kit/core';

const sensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
);
```
Remover `PointerSensor` do import se não usado em outro lugar.

### 2. `src/pages/Tasks.tsx`
Mesma substituição (atualmente tem `PointerSensor` com `distance: 3, tolerance: 5`).

### 3. `src/components/ui/sortable-task-card.tsx`
- Remover `<button GripVertical>` lateral e import `GripVertical`.
- Mover `{...attributes} {...listeners}` do botão para o `<div>` raiz (que já tem `setNodeRef`).
- Adicionar `cursor-grab active:cursor-grabbing` no wrapper.
- `handleClick` no `TaskCard` filho continua chamando `onViewDetails` — `distance: 5` no mouse garante que clique simples não dispara drag.

### 4. `src/components/ui/sortable-personal-task-card.tsx`
Revisão apenas — listeners já estão na raiz, sem ícone Grip. Confirmar que botões internos têm `e.stopPropagation()`.

### 5. `src/components/crm/SortableLeadCard.tsx`
Sem alteração estrutural (já refatorado anteriormente). Beneficia automaticamente do novo sensor.

## Guardrails

| # | Garantia | Aplicação |
|---|---|---|
| 1 | Scroll mobile preservado | `TouchSensor` com `delay: 250ms` — dedo deslizando faz scroll; pousado >250ms inicia drag. |
| 2 | Clique abre detalhes (desktop) | `MouseSensor` com `distance: 5` — clique estático nunca aciona drag. |
| 3 | Botões internos não disparam drag | Manter `onPointerDown={(e) => e.stopPropagation()}` e `onClick stopPropagation` em DropdownMenu, WhatsApp, Reunião, MoreHorizontal. |
| 4 | Sem regressão visual | `cursor-grab active:cursor-grabbing` em todos os cards arrastáveis. |

## Ficheiros alterados
- `src/components/crm/LeadsKanban.tsx` (sensors)
- `src/pages/Tasks.tsx` (sensors)
- `src/components/ui/sortable-task-card.tsx` (remove Grip + listeners na raiz)
- `src/components/ui/sortable-personal-task-card.tsx` (revisão)

Sem migrations. Sem mudanças em queries ou edge functions.

