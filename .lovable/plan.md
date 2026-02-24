
# Correcao de Scroll no Modal de Preview do Planejamento

## Problema
O modal de preview do planejamento gerado pela IA (`ContentPlanPreview.tsx`) nao permite rolar verticalmente para ver todos os conteudos. O `ScrollArea` tem `max-h-[50vh]` que limita o espaco disponivel, especialmente quando a area de estrategia e outros elementos acima ocupam espaco significativo.

## Alteracao

### ContentPlanPreview.tsx (linha 113)
- Remover `max-h-[50vh]` do `ScrollArea`
- Manter `flex-1 min-h-0` que ja faz o componente ocupar todo o espaco disponivel dentro do dialog flex
- O dialog pai ja tem `max-h-[90vh]` e `flex flex-col`, entao o ScrollArea vai preencher o espaco restante corretamente

**Antes:** `className="flex-1 min-h-0 max-h-[50vh] pr-2"`
**Depois:** `className="flex-1 min-h-0 pr-2"`

Isso permite que a lista de conteudos use todo o espaco vertical disponivel no modal, permitindo scroll completo por todos os itens.
