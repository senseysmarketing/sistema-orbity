

# Alinhamento das colunas na visualização em lista de Tarefas

## Diagnóstico

Em `TaskListView.tsx`, cada grupo de status (ex: "Em Revisão", "Aguardando Material") renderiza uma `<Table>` independente dentro de um `<AccordionItem>`. Sem largura fixa, cada tabela calcula a largura das colunas com base no próprio conteúdo — então grupos com muitas linhas (Em Revisão, 17) ficam com colunas Cliente/Responsáveis maiores, "empurrando" os badges para a direita; grupos com poucas linhas (Onboarding, Em Andamento) encolhem essas colunas e os badges aparecem colados ao título.

Resultado visual: badges de Cliente e avatares de Responsáveis dançam de posição entre os grupos.

## Solução

Padronizar as larguras das 8 colunas em **todas** as tabelas, garantindo alinhamento idêntico independentemente do grupo. Cliente e Responsáveis ficam **alinhados à direita** (próximos das colunas Prioridade/Entrega), como acontece hoje no grupo "Em Revisão".

### Mudanças em `src/components/tasks/TaskListView.tsx`

1. **Adicionar `table-fixed` na `<Table>`** + `<colgroup>` com larguras explícitas para travar o layout:

   | Coluna | Largura |
   |---|---|
   | Checkbox | 40px |
   | Tipo (ícone) | 32px |
   | Título | `auto` (consome o espaço sobrando) |
   | Cliente | 180px |
   | Responsáveis | 160px |
   | Prioridade | 90px |
   | Entrega | 110px |
   | Ações | 40px |

2. **Empurrar Título para ocupar o espaço flexível**: célula do título fica com `w-full` + `truncate`, e as colunas Cliente/Responsáveis/Prioridade/Entrega ficam fixas à direita — exatamente como aparece hoje em "Em Revisão".

3. **Conteúdo das células fixas alinhado à esquerda dentro da própria célula** (mantém legibilidade), mas como as colunas têm largura fixa, badges e avatares ficam na mesma coordenada X em todos os grupos.

4. **Truncate no título** (`truncate` + `max-w-0` no padrão flex/table-fixed) para títulos longos não quebrarem o layout em grupos densos.

### Sem mudanças

- Nenhuma alteração na lógica de filtros, ordenação, agrupamento ou ações.
- Visualização Kanban (`SortableTaskCard`) intacta.
- Demais telas (Dashboard `MyTasksList`, `RequestedTasksList`) intactas.

## Arquivo editado

- `src/components/tasks/TaskListView.tsx` — adicionar `table-fixed` + `<colgroup>` com larguras fixas; ajustar célula do título para `truncate`.

