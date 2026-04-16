

# Hover scale sutil nos cards de tarefa

## Análise
O efeito que você notou no card do CRM é o `transition-all` aplicado no `<Card>` que, combinado com o crescimento da grid-row dos botões, dá uma sensação de "respiração" do card inteiro. Para os cards de tarefa (sem botões para expandir), vamos replicar apenas a parte sutil do "grow" — um leve scale + sombra no hover, mantendo a estética premium.

## Mudança

Em `src/components/ui/task-card.tsx` (componente base usado em Kanban e listas), adicionar ao `<Card>` raiz:

```tsx
className="... transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
```

### Detalhamento
- `hover:scale-[1.02]` — crescimento sutil de 2% (não exagerado, mantém grid alinhado)
- `hover:-translate-y-0.5` — leve "elevação" de 2px para sensação tátil
- `hover:shadow-lg` — sombra maior reforça a elevação
- `transition-all duration-300 ease-out` — animação suave idêntica à do CRM
- Preservar todas as classes existentes (cores, padding, borders)

### Aplicação
- Apenas em `task-card.tsx` (componente compartilhado) → propaga automaticamente para:
  - `SortableTaskCard` (Kanban de tarefas)
  - Qualquer outra view que use `TaskCard`

### Não alterar
- `MyTasksList.tsx` (linhas de dashboard, não cards) — manter como está
- `DemoTasksView.tsx` (landing demo) — manter como está
- Lógica de drag (dnd-kit) — scale só no hover, não interfere com `isDragging` (que usa opacity)

## Comportamento garantido
| Cenário | Resultado |
|---------|-----------|
| Repouso | Card normal, sem alterações visuais |
| Hover desktop | Cresce 2%, sobe 2px, sombra acentuada (300ms) |
| Drag ativo | Opacity 0.5 prevalece, scale neutralizado |
| Mobile/touch | Sem hover, comportamento inalterado |

## Ficheiro alterado
- `src/components/ui/task-card.tsx` (apenas a className do `<Card>` raiz)

Sem mudança em props, hooks, ou estrutura.

