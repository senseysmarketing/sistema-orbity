

# Fix drag-and-drop dos cards de Lead

## Diagnóstico

Olhando `src/components/crm/SortableLeadCard.tsx`:

1. O `useSortable` do dnd-kit está aplicado no `<div>` wrapper, mas os `{...listeners}` e `{...attributes}` estão **apenas no botão `GripVertical`** (linhas ~178-186).
2. O `Card` interno tem `hover:scale-[1.02]` e `hover:brightness-110` — quando o cursor entra na zona do botão de arrastar (canto direito), o hover do Card é mantido, mas o `group-hover` faz a barra de botões (WhatsApp/Reunião) **expandir**, empurrando layout e fazendo o handle "fugir" do cursor.
3. O `onClick` do Card chama `onView(lead)` — por isso não dá para simplesmente colocar listeners no Card inteiro sem conflito (qualquer clique abriria o lead).

## Solução: Card inteiro arrastável + ativação por delay

Usar o **`activationConstraint`** do dnd-kit para distinguir clique de arrasto:

- **PointerSensor com `activationConstraint: { delay: 200, tolerance: 8 }`** → segurar 200ms inicia drag; clique rápido abre o lead.
- Mover `{...listeners} {...attributes}` para o **Card inteiro** (não mais o botão lateral).
- **Remover** o botão `GripVertical` lateral (não é mais necessário).
- Manter `cursor-grab active:cursor-grabbing` no Card.
- O `handleClick` continua chamando `onView` — dnd-kit não dispara click se o pointer ultrapassar a tolerância/delay.

### Onde está o sensor?

Buscar no `LeadKanban` (pai que monta `<DndContext>`). Provavelmente em `src/components/crm/LeadKanban.tsx` ou similar — preciso confirmar onde os sensors são configurados e ajustar o `activationConstraint`. Se já existir, troco. Se for o default (`PointerSensor` sem constraint), adiciono.

### Bônus — corrigir o "encolher no hover"

O `hover:scale-[1.02]` no Card combinado com `group-hover` expandindo botões cria movimento visual estranho durante o drag attempt. Vou:
- **Manter** `hover:shadow-lg` e `hover:brightness-110` (feedback visual sutil).
- **Remover** `hover:scale-[1.02]` do Card (era a causa do "encolher/expandir" que dificultava mirar no handle).
- Os botões WhatsApp/Reunião continuam aparecendo no `group-hover` via `grid-rows` (já está bom).

## Mudanças

### 1. `src/components/crm/SortableLeadCard.tsx`
- Mover `{...attributes} {...listeners}` do `<button GripVertical>` para o `<Card>`.
- Remover o `<button>` do GripVertical e o ícone do import.
- Remover `hover:scale-[1.02]` do Card.
- Adicionar `cursor-grab active:cursor-grabbing` ao Card.
- O DropdownMenu trigger e os botões de ação (WhatsApp/Reunião) já têm `e.stopPropagation()` / `onPointerDown stopPropagation` — isso continua funcionando para impedir que cliques neles iniciem drag.

### 2. Localizar e ajustar sensors do `<DndContext>` (provavelmente `LeadKanban.tsx`)
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  })
);
```
- `delay: 200ms` → segurar para arrastar.
- `tolerance: 8px` → cancela delay se mover muito antes (permite scroll natural).

## Resultado

- Card inteiro arrastável segurando 200ms.
- Clique rápido abre detalhes do lead (sem regressão).
- Handle lateral (`GripVertical`) removido — mais espaço útil.
- Sem mais "encolhe ao passar o mouse" — bug do scale eliminado.
- Botões WhatsApp/Reunião continuam aparecendo no hover sem interferir no drag.

## Ficheiros alterados
- `src/components/crm/SortableLeadCard.tsx`
- `src/components/crm/LeadKanban.tsx` (ou onde estiver o `DndContext`/`useSensors`) — apenas ajuste do `activationConstraint`.

Sem migrations. Sem mudanças em queries.

