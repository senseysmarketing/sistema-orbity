

# Fix: Card de Lead transparente durante drag (igual Trello)

## Causa raiz

A diferença real entre Tarefas e Leads não está nos estilos — está em **quem decide o `isDragging`**:

**Tarefas (correto, estilo Trello):**
- `SortableTaskCard` lê `isDragging` do próprio `useSortable()`.
- Card-fonte na coluna: `isDragging = true` → fica 50% transparente (placeholder).
- Clone no `<DragOverlay>`: renderiza fora do `SortableContext`, então `useSortable().isDragging = false` → **fica 100% opaco e sólido**, igual Trello.

**Leads (bugado):**
- `LeadsKanban.tsx` passa `isDragging={true}` **como prop forçada** para o clone do `<DragOverlay>` (linha 357).
- Resultado: o card que segue o cursor sai com `opacity: 0.5` → exatamente a transparência do print.
- Pior: o card-fonte na coluna não recebe `isDragging` nenhum (ninguém lê do `useSortable`), então fica 100% opaco — invertido em relação a Tarefas.

## Mudança

### a) `src/components/crm/SortableLeadCard.tsx`
- Adicionar `isDragging` à desestruturação do `useSortable()` (renomear para evitar conflito com a prop): `isDragging: sortableIsDragging`.
- Calcular `effectiveIsDragging = sortableIsDragging || isDragging` para manter compatibilidade.
- Usar `effectiveIsDragging` no `style.opacity` e na className.
- Resultado: card-fonte fica 50% (placeholder), clone do overlay fica 100% sólido.

### b) `src/components/crm/LeadsKanban.tsx` (linha 357)
- Remover `isDragging={true}` do `<SortableLeadCard>` dentro do `<DragOverlay>`.
- A prop continua opcional (`isDragging?: boolean`, default `false`) para não quebrar nada.

### c) Bônus de fluidez (já alinha com Tasks 100%)
Em `SortableLeadCard.tsx`, simplificar o wrapper para o mesmo padrão de `SortableTaskCard`:
- Mover `{...attributes} {...listeners}` do `<Card>` para o `<div>` externo (igual Tasks faz).
- Remover `className="relative"` extra e usar `className="relative cursor-grab active:cursor-grabbing"` no wrapper.
- Manter `<Card>` apenas com `select-none border-[#5a35a0]` + ramo `isDragging` com `shadow-2xl border-primary/50` (visual do clone sólido com sombra forte, estilo Trello).

## Não-mexer

- Lógica de drag (`handleDragStart/End`, optimistic patch, `LossReasonDialog`).
- Sensores, `DndContext`, `LeadKanbanColumn`.
- Conteúdo visual interno do card (badges, botões WhatsApp/Reunião, etc.).

## Resultado esperado (idêntico Trello)

- Ao segurar e arrastar: card original fica fantasma 50% na coluna, clone que **segue o cursor é 100% opaco e sólido** com sombra elevada.
- Sem stutter — `transform` direto do dnd-kit sem brigar com transitions.
- Comportamento 1:1 com a tela de Tarefas.

