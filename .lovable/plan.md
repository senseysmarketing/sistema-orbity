

# Aumentar largura das colunas do Kanban

## Problema

Os badges nos cards de tarefas (tipo, prioridade, urgencia) estao sendo comprimidos e quebrando em duas linhas devido a largura atual das colunas (330px no desktop, 280px no mobile).

## Solucao

Aumentar a largura minima e fixa das colunas em aproximadamente 20-30px para dar mais espaco horizontal aos badges.

## Alteracoes

### `src/components/ui/kanban-column.tsx` (linha 67)

Alterar as classes de largura do container da coluna:
- Mobile: de `min-w-[280px] w-[280px]` para `min-w-[300px] w-[300px]`
- Desktop: de `md:min-w-[330px] md:w-[330px]` para `md:min-w-[360px] md:w-[360px]`

Isso adiciona 20px no mobile e 30px no desktop, suficiente para que os 3 badges (tipo + prioridade + urgencia) caibam em uma unica linha na maioria dos casos.

