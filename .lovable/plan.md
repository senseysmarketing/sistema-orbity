
# Atribuir Usuarios nas Tarefas do Planejamento de Conteudo

## Problema
Atualmente, quando o planejamento de conteudo e convertido em tarefas, elas sao criadas sem atribuicao a nenhum usuario, ficando "soltas" no sistema.

## Solucao

Adicionar um seletor de usuarios no fluxo de criacao de tarefas a partir do planejamento. A abordagem mais pratica e adicionar o seletor de usuarios na **tela de Preview** (onde o usuario revisa os conteudos gerados pela IA antes de salvar), permitindo definir um ou mais responsaveis que serao atribuidos a **todas as tarefas criadas** de uma vez.

Opcionalmente, tambem sera possivel definir responsaveis diferentes por conteudo individual, mas o padrao sera um responsavel global para simplificar o fluxo.

## Alteracoes

### 1. WizardData (useContentPlanning.tsx)
- Adicionar campo `assignedUserIds: string[]` ao tipo `WizardData`

### 2. ContentPlanWizard.tsx
- No **Passo 1 (Contexto do Cliente)**, apos selecionar o cliente, adicionar o componente `MultiUserSelector` para escolher os responsaveis padrao das tarefas
- Buscar a lista de usuarios da agencia via `agency_users` + `profiles` (mesmo padrao usado em outros formularios)
- O campo sera opcional mas recomendado

### 3. ContentPlanPreview.tsx
- Exibir os usuarios selecionados no resumo (badge com nomes)
- Permitir alterar a selecao antes de criar as tarefas
- Passar os `assignedUserIds` para a funcao `onSaveAndCreateTasks`

### 4. useContentPlanning.tsx - createTasksFromItems
- Apos criar cada tarefa, inserir registros na tabela `task_assignments` com os `user_ids` selecionados
- Usar o mesmo padrao de insert em lote: `{ task_id, user_id }` para cada combinacao

### 5. ContentPlanningList.tsx
- Passar os `assignedUserIds` do wizard para o preview e para a funcao de criacao de tarefas

## Detalhes Tecnicos

- Reutilizar o componente `MultiUserSelector` ja existente em `src/components/tasks/MultiUserSelector.tsx`
- Query para buscar usuarios: `agency_users` join `profiles` filtrado por `agency_id` (mesmo padrao do wizard de tarefas)
- Insert de assignments apos criacao da tarefa:
```text
for each task created:
  for each userId in assignedUserIds:
    insert into task_assignments(task_id, user_id)
```
- Nao requer migracoes de banco de dados - a tabela `task_assignments` ja existe

## Fluxo do Usuario

```text
Wizard Passo 1: Seleciona cliente + responsaveis
         |
Wizard Passos 2-5: Configuracao normal
         |
Preview: Ve os conteudos + responsaveis selecionados
         |
"Salvar e Criar Tarefas": Cria tarefas JA atribuidas aos usuarios
```
