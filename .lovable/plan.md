# Ajustes no Planejamento de Redes Sociais

## 1. Sheet do planejamento (`ContentPlanDetailsSheet.tsx`)

- Remover a distinção entre "Ver detalhes" e "Editar planejamento". O sheet sempre abre em modo edição.
- Botão **Adicionar conteúdo** sempre visível no topo da lista (eliminar o gate `editMode`).
- Lista de itens sempre mostrando os botões de ação (editar, duplicar, excluir).
- Manter o bloco de criação de tarefas (seleção de pendentes + responsáveis + botão "Criar X tarefas") sempre visível quando houver pendentes, independente de modo.
- No botão de **Editar conteúdo** (lápis): ocultar quando `item.task_id` existir (conteúdo já virou tarefa). Manter apenas duplicar / abrir tarefa / arquivar.

## 2. `ContentPlanCard.tsx` (menu dos 3 pontos)

- Remover a opção "Ver detalhes". Manter apenas "Editar planejamento" (e demais ações já existentes como duplicar, arquivar).
- Clique no card chama direto `handleEditPlan` (modo edição) em vez de `handleViewPlan`.

## 3. `ContentPlanningList.tsx`

- Como agora só existe um modo, remover o state `detailsEditMode` (ou fixar em `true`) e simplificar os handlers `handleViewPlan` / `handleEditPlan` / `handleCreateTasksFromPlan` para uma única função que abre o sheet.

## 4. Modal de criação/edição de conteúdo (`ContentPlanItemEditDialog.tsx`)

Espelhar visualmente o formulário de tarefas de redes sociais, com:

- Renomear o label "Data de publicação" para **"Data de vencimento"** (mesmo campo `post_date`, que já é usado como `due_date` ao gerar a tarefa). Deixar o campo em destaque, no topo logo após Título.
- Reordenar campos seguindo o padrão da tarefa de redes sociais: Título → Data de vencimento → Formato + Plataforma → Tipo de conteúdo → Objetivo → Ideia/descrição → Legenda → Instruções criativas → Referências → Hashtags.
- Ajuste estético no `<Select>` de Formato: exibir cada opção com a primeira letra maiúscula (ex.: "Carrossel", "Feed", "Reels", "Stories", "Vídeo", "Artigo"). Manter o `value` em minúsculas para não quebrar dados existentes — só capitalizar o label exibido.

## Detalhes técnicos

- `editMode` deixa de ser prop relevante em `ContentPlanDetailsSheet`. Pode ser removido da interface ou mantido com default `true` para evitar breaking changes em outros locais (verificar `ContentPlanningList`).
- Para esconder o botão editar quando `item.task_id`: condicional `{!item.task_id && <Button …Pencil…/>}` dentro do bloco de ações.
- Capitalização no Select: criar helper `capitalize(str)` e usar `{capitalize(f)}` no `SelectItem`.
- Nenhuma alteração de schema é necessária; `post_date` continua sendo a fonte da data e já é mapeado para `due_date` na criação da tarefa.

## Arquivos afetados

- `src/components/social-media/planning/ContentPlanDetailsSheet.tsx`
- `src/components/social-media/planning/ContentPlanCard.tsx`
- `src/components/social-media/planning/ContentPlanningList.tsx`
- `src/components/social-media/planning/ContentPlanItemEditDialog.tsx`
