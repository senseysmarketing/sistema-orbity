

# Remover scroll horizontal da lista de tarefas

## Diagnóstico

O wrapper `<div className="overflow-x-auto">` ao redor da `<Table>` força barra de rolagem horizontal mesmo quando o conteúdo cabe. Combinado com `table-fixed` + `colgroup` somando ~692px de colunas fixas + título flexível, em larguras menores aparece scroll. Em telas largas (1976px atuais) sobra espaço, mas o `overflow-x-auto` ainda renderiza a barra visualmente em alguns navegadores.

## Solução

1. **Remover `overflow-x-auto`** — substituir por `<div className="w-full">` simples. A tabela ocupa 100% da largura disponível naturalmente.

2. **Truncar título com limite visual** — já existe `truncate` + `max-w-0` na célula. Manter, mas garantir que o `<span>` interno também respeite com `block truncate` para títulos longos como "Post | Tema: Gestão e Processo - O Ângulo do Inimigo Oculto…" virarem `…` no fim sem empurrar layout.

3. **Manter colunas fixas à direita** — Cliente (180px), Responsáveis (160px), Prioridade (90px), Entrega (110px), Ações (40px) continuam alinhadas como aprovado anteriormente.

4. **Sem scroll horizontal** — em viewports pequenos (<1024px), o título encolhe e trunca; nunca aparece barra. Em viewports grandes, o título expande e ocupa o espaço sobrando — sem "vazio feio" e sem rolagem.

## Arquivo editado

- `src/components/tasks/TaskListView.tsx` — remover `overflow-x-auto`; reforçar truncate no `<span>` do título.

## Sem mudanças

- Larguras das colunas, ordenação, agrupamento, ações, Kanban, demais telas.

