

# Adicionar Edicao de Itens no Planejamento de Conteudo

## Resumo

Adicionar a capacidade de editar planejamentos ja salvos: editar itens individuais (titulo, descricao, formato, plataforma, data, instrucoes criativas), adicionar novos itens manualmente e excluir itens indesejados -- tudo antes de criar as tarefas.

## O que muda para o usuario

- No menu de 3 pontinhos do card, aparecera uma nova opcao **"Editar planejamento"**
- Ao clicar, abre o painel lateral (Sheet) em **modo de edicao**, onde cada item tera:
  - Botao de editar (abre formulario inline ou dialog para alterar titulo, descricao, formato, plataforma, data, instrucoes criativas, objetivo)
  - Botao de excluir item individual
- Um botao **"Adicionar conteudo"** no topo permite inserir novos itens manualmente ao planejamento
- Todas as alteracoes sao salvas diretamente no banco (content_plan_items)

## Alteracoes Tecnicas

### 1. Hook `useContentPlanning.tsx` -- novas funcoes

Adicionar 3 funcoes ao hook:

- **`updatePlanItem(itemId, updates)`** -- UPDATE no `content_plan_items` com os campos editados
- **`deletePlanItem(itemId)`** -- DELETE do item do `content_plan_items`
- **`addPlanItem(planId, itemData)`** -- INSERT de novo item no `content_plan_items` com status "planned"

### 2. Novo componente `ContentPlanItemEditDialog.tsx`

Dialog/formulario para editar um item individual com campos:
- Titulo (input)
- Descricao (textarea)
- Data de publicacao (date picker)
- Formato (select: carrossel, feed, reels, stories)
- Plataforma (input/select)
- Tipo de conteudo (select)
- Instrucoes criativas (textarea)
- Objetivo (input)
- Hashtags (input)

### 3. `ContentPlanCard.tsx` -- nova opcao no menu

Adicionar item "Editar planejamento" no DropdownMenu, com icone de lapis (Pencil), que chama um novo callback `onEdit`.

### 4. `ContentPlanDetailsSheet.tsx` -- modo edicao

Transformar o Sheet para suportar dois modos:
- **Modo visualizacao** (atual): selecionar itens e criar tarefas
- **Modo edicao** (novo): cada item mostra botoes de editar/excluir, mais botao de adicionar item

Adicionar props: `editMode`, `onUpdateItem`, `onDeleteItem`, `onAddItem`.

### 5. `ContentPlanningList.tsx` -- orquestrar edicao

- Receber as novas funcoes do hook
- Adicionar handler `handleEditPlan` que abre o Sheet em modo edicao
- Passar callbacks de update/delete/add para o Sheet

### 6. Novo componente `AddPlanItemDialog.tsx`

Dialog simples para criar um novo item com os mesmos campos do edit, inicializado vazio, que insere via `addPlanItem`.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useContentPlanning.tsx` | Adicionar updatePlanItem, deletePlanItem, addPlanItem |
| `src/components/social-media/planning/ContentPlanCard.tsx` | Nova opcao "Editar" no menu |
| `src/components/social-media/planning/ContentPlanDetailsSheet.tsx` | Suportar modo edicao com botoes editar/excluir/adicionar |
| `src/components/social-media/planning/ContentPlanItemEditDialog.tsx` | Novo componente -- formulario de edicao |
| `src/components/social-media/planning/ContentPlanningList.tsx` | Orquestrar edicao e passar novos callbacks |

