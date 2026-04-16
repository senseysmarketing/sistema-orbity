

# Card compacto que expande no hover

## Problema
Atualmente os botões existem no DOM mas com `opacity-0`, ocupando espaço vertical mesmo invisíveis → cria área vazia no card em repouso.

## Solução
Em `SortableLeadCard.tsx`, em vez de animar apenas `opacity`, animar **altura + opacidade** para que o espaço seja "cortado" em repouso e expanda suavemente no hover (desktop). No mobile, manter sempre visível (touch não tem hover).

### Técnica
Usar `grid-template-rows` animado (truque CSS moderno e performático para animar height: auto):

```tsx
<div className="grid transition-all duration-300 ease-out 
                grid-rows-[1fr] 
                md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr]
                md:opacity-0 md:group-hover:opacity-100">
  <div className="overflow-hidden">
    <div className="flex gap-2 pt-1" onPointerDown={(e) => e.stopPropagation()}>
      {/* WhatsApp + Reunião buttons (mantidos exatamente como estão) */}
    </div>
  </div>
</div>
```

### Comportamento
| Estado | Desktop | Mobile |
|--------|---------|--------|
| Repouso | Altura 0, sem espaço vazio | Botões visíveis |
| Hover | Expande suave (300ms) revelando botões | (sem hover) |
| Drag | Permanece colapsado | Permanece visível |

### Detalhes
- `grid-rows-[0fr] → [1fr]` é a forma canônica de animar `height: auto` no Tailwind/CSS puro
- `overflow-hidden` no filho garante que o conteúdo seja "cortado" durante a transição
- `pt-1` adiciona respiro apenas quando expandido (faz parte do conteúdo cortado)
- Combina com `opacity` para fade-in elegante junto com a expansão
- Mantém `onPointerDown stopPropagation` (anti-drag) e todos os handlers existentes

## Ficheiro alterado
- `src/components/crm/SortableLeadCard.tsx` (apenas o wrapper dos botões — ~10 linhas)

Sem mudança em props, hooks ou outros componentes.

