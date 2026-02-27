

# Cards de Lead com Fundo Roxo Solido (#4c2882)

## Resumo

Aplicar o mesmo estilo visual dos cards de tarefas nos cards de lead do CRM: fundo roxo solido `#4c2882`, textos em branco/claro, e borda sutil `#5a35a0`.

## O que muda visualmente

- Fundo de todos os cards de lead: roxo solido `#4c2882` (igual aos cards de tarefa)
- Borda: `#5a35a0`
- Nome do lead: `text-white`
- Cargo (position): `text-white/60`
- Informacoes (email, telefone, empresa, source, data): `text-white/70`
- Icones de informacao: `text-white/50`
- Hover: sombra roxa sutil (`shadow-purple-900/30`) e `brightness-110`
- Grip icon (arrastar): `text-white/50` com hover `text-white/80`
- Badges de status e temperatura: mantidos com suas cores originais (se destacam contra o fundo escuro)
- Area de valor (verde): mantida com suas cores proprias
- Badge de WhatsApp: mantido com estilo verde
- Remove a logica de `getCardBackground()` baseada em urgencia/status (o fundo sera sempre roxo)

## Detalhes Tecnicos

### Arquivo: `src/components/crm/SortableLeadCard.tsx`

**1. Card - fundo roxo solido e borda**

Substituir o className dinamico do `Card` para usar fundo fixo e borda roxa:
- Remover chamada a `getCardBackground()`
- Adicionar `style={{ backgroundColor: '#4c2882' }}` e `border-[#5a35a0]`
- Hover: `hover:shadow-lg hover:shadow-purple-900/30 hover:brightness-110`

**2. Textos em branco/claro**

- Nome (`h4`): adicionar `text-white`
- Cargo: `text-white/60` em vez de `text-muted-foreground`
- Informacoes de contato e meta-dados: `text-white/70`
- Icones: `text-white/50` em vez de `text-muted-foreground`
- Icone de urgencia no calendario: manter vermelho/laranja para urgente/hoje

**3. Grip icon em branco**

- Mudar de `text-muted-foreground hover:text-foreground` para `text-white/50 hover:text-white/80`

**4. Botao de acoes (3 pontos)**

- Adicionar `text-white/70 hover:text-white` para manter visibilidade

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/crm/SortableLeadCard.tsx` | Fundo roxo #4c2882, textos brancos, grip branco |

