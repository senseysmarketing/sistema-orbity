

# Cards de Tarefas com Fundo Roxo Solido

## Resumo

Aplicar fundo roxo escuro (igual ao menu lateral `#1c102f`) nos cards de tarefas, com textos em branco/claro para criar contraste elegante e destacar os badges coloridos.

## O que muda visualmente

- Fundo dos cards: roxo escuro solido (`hsl(var(--sidebar-background))`) em vez do fundo baseado na cor do cliente
- Titulo: branco
- Descricao e meta-info (data, usuarios): branco com opacidade (70-80%) para hierarquia visual
- Icone de status: branco
- Badges de tipo, prioridade e urgencia: mantidos com suas cores originais -- agora se destacam mais contra o fundo escuro
- Badge do cliente: mantido com cor propria (ja e colorido com texto branco)
- Borda do card: sutil em roxo mais claro (`hsl(266 62% 20%)`) para separacao
- Hover: leve clareamento (`brightness-110`) e sombra roxa sutil
- Grip icon do drag (no SortableTaskCard): branco com opacidade

## Sugestoes extras incluidas

- Sombra sutil roxa no hover para efeito de "glow"
- Transicao suave no hover para feedback visual elegante

## Detalhes Tecnicos

### Arquivo: `src/components/ui/task-card.tsx`

**1. Substituir fundo dinamico por fundo roxo solido**

Remover o `style={{ backgroundColor: clientColor... }}` inline e usar classes Tailwind com a variavel CSS da sidebar:

```tsx
className="p-3 md:p-4 rounded-lg border border-[hsl(266,62%,20%)] cursor-pointer 
  hover:shadow-lg hover:shadow-purple-900/30 hover:brightness-110 transition-all"
style={{ backgroundColor: 'hsl(266, 62%, 12%)' }}
```

**2. Textos em branco/claro**

- Titulo: `text-white`
- Descricao: `text-white/70`
- Data e usuarios: `text-white/60`
- Icone de status: `text-white`

**3. Manter badge do cliente com cor propria**

O badge colorido do cliente continua usando `clientColor` como background -- ja tem `color: white`, entao fica otimo contra o fundo escuro.

### Arquivo: `src/components/ui/sortable-task-card.tsx`

**1. Grip icon em branco**

Mudar a cor do icone de arrastar para branco com opacidade: `text-white/50 hover:text-white/80`.

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/ui/task-card.tsx` | Fundo roxo solido, textos brancos, hover com glow roxo |
| `src/components/ui/sortable-task-card.tsx` | Grip icon em branco |

