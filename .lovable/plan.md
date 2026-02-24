

# Correcao de Quebra de Linha nos Badges dos Cards de Tarefas

## Problema
Os badges de metadados (tipo, prioridade, urgencia) nos cards do Kanban estao quebrando linha, especialmente quando ha 3 badges simultaneos (ex: "Redes Sociais" + "Media" + "Atrasada"). Isso ocorre apesar do container ter `flex-nowrap`.

## Causa
Cada `Badge` nao possui `whitespace-nowrap` e `flex-shrink-0`, entao mesmo com `flex-nowrap` no container pai, o texto interno dos badges pode quebrar (ex: "Redes Sociais" vira duas linhas). Alem disso, o badge de tipo pode ter textos longos.

## Alteracoes

### 1. `src/components/ui/task-card.tsx`
- Adicionar `whitespace-nowrap flex-shrink-0` a todos os Badges da linha de metadados para garantir que nenhum badge quebre texto interno
- Isso se aplica aos 3 badges: tipo, prioridade e urgencia

### 2. `src/components/ui/kanban-column.tsx`
- Aumentar a largura minima das colunas de `min-w-[300px] md:min-w-[360px] w-[300px] md:w-[360px]` para `min-w-[320px] md:min-w-[380px] w-[320px] md:w-[380px]`
- Isso garante espaco suficiente para acomodar 3 badges em uma unica linha

### Detalhes tecnicos
No `task-card.tsx`, cada Badge recebera classes adicionais:
- Badge de tipo: `text-xs whitespace-nowrap flex-shrink-0`
- Badge de prioridade: `... text-white text-xs whitespace-nowrap flex-shrink-0`
- Badge de urgencia: `... text-xs flex items-center gap-1 whitespace-nowrap flex-shrink-0`

No `kanban-column.tsx`, a div raiz da coluna tera larguras ajustadas de 300/360 para 320/380.

