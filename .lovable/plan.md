

# Fluidez do drag-and-drop nos cards de Leads (CRM)

## Diagnóstico

Comparação direta entre `SortableLeadCard` (CRM) e `SortableTaskCard` (Tarefas):

| Aspecto | Tarefas (fluido) | Leads (com lag/transparência) |
|---|---|---|
| Estilo durante drag | `opacity: 0.5` apenas | `opacity: 0.8` + `scale: 1.05` + `zIndex: 999` |
| Transform | `CSS.Transform.toString` | `CSS.Translate.toString` |
| Classes de transição | nenhuma extra | `transition-all duration-200` + `hover:shadow-lg hover:shadow-purple-900/30 hover:brightness-110` + troca de `shadow-2xl border-primary/50` no drag |
| Fonte de `isDragging` | `useSortable().isDragging` (estado real do dnd-kit) | prop externa passada apenas pelo `DragOverlay` |

Problemas que causam a sensação de "card transparente e travado":
1. O **clone do `DragOverlay`** está renderizado com `opacity: 0.8` + `scale(1.05)` — é justamente esse clone que segue o cursor e parece "meio transparente".
2. `transition-all duration-200` na `Card` aplica transição também à propriedade `transform` durante o drag, brigando com o `transform` que o dnd-kit aplica em cada frame → micro-stutter.
3. `hover:brightness-110` + `hover:shadow-purple-900/30` disparam filtros caros (filter/box-shadow) enquanto o ponteiro varre colunas durante o arraste.
4. `scale: 1.05` e `zIndex: 999` no clone forçam camadas de composição extras.

## Mudança

Arquivo único: **`src/components/crm/SortableLeadCard.tsx`**.

### a) Estilo do `style` inline (linhas 111–117)
Alinhar 1:1 ao padrão de Tarefas:
```ts
const style = {
  transform: CSS.Transform.toString(transform), // troca de Translate → Transform
  transition,
  opacity: isDragging ? 0.5 : 1,                // remove scale e zIndex
};
```

### b) ClassName do `<Card>` (linhas 146–150)
Remover transições e hovers que pesam durante o drag:
- Remover `transition-all duration-200`.
- Remover `hover:shadow-lg hover:shadow-purple-900/30 hover:brightness-110`.
- Manter ramo `isDragging` apenas com `shadow-2xl border-primary/50` (visual do clone no overlay).
- Manter `cursor-grab active:cursor-grabbing select-none border-[#5a35a0]`.

Resultado: clone do `DragOverlay` aparece nítido (sem 0.8/scale/blur de hover) e o card-fonte simplesmente fica em `opacity: 0.5` igual em Tarefas. Hover effects voltam ao normal quando não há drag (sem hover durante drag = sem repaints inúteis).

### c) Sem mudanças em `LeadsKanban.tsx`
A prop `isDragging={true}` continua sendo passada pelo `<DragOverlay>` para o clone — comportamento inalterado, apenas o efeito visual fica mais leve.

## Não-mexer

- Lógica de `handleDragStart/handleDragEnd`, optimistic patch, `LossReasonDialog`.
- `LeadKanbanColumn`, `useLeadStatuses`, normalização de status.
- Nenhuma alteração em Tarefas, sensores, ou `DndContext`.

## Resultado esperado

- Card-fonte com fade leve (50%) idêntico ao de Tarefas.
- Clone do overlay nítido, sem escala/sombra extra.
- Sem `transition` em `transform` durante o arrasto → 60fps consistente, sem o "atraso elástico" atual.
- Hover effects preservados fora do drag.

