

# Ajuste de Layout dos Badges no Card de Tarefas

## Problema Identificado

Os badges (Tipo, Prioridade, Urgência) estão quebrando para múltiplas linhas devido ao `flex-wrap` quando há 3 badges no card. Isso acontece porque a largura do card é fixa (330px) e não há espaço suficiente para todos os badges na mesma linha.

## Solução Proposta

Reorganizar o layout do card para que todos os badges fiquem alinhados horizontalmente, utilizando scroll horizontal quando necessário ou reorganizando a hierarquia visual.

**Opção escolhida**: Manter todos os badges na mesma linha com `overflow-x-auto` e `flex-nowrap`, permitindo scroll horizontal sutil quando necessário. Isso garante que os badges nunca quebrem para uma nova linha.

## Alterações

**Arquivo**: `src/components/ui/task-card.tsx`

**De**:
```tsx
<div className="flex gap-1 flex-wrap">
```

**Para**:
```tsx
<div className="flex gap-1 flex-nowrap overflow-x-auto scrollbar-hide">
```

Também vamos adicionar uma classe utilitária para esconder a scrollbar mantendo a funcionalidade de scroll (para casos extremos onde há muitos badges).

## Resultado Esperado

- Todos os badges (Tipo, Prioridade, Urgência) ficam alinhados na mesma linha
- Em casos raros com textos muito longos, haverá scroll horizontal discreto
- Layout mais limpo e consistente visualmente

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/components/ui/task-card.tsx` | Alterar layout dos badges para `flex-nowrap` |
| `src/index.css` | Adicionar classe utilitária `.scrollbar-hide` (se não existir) |

