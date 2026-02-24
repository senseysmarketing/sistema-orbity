
# Recuperacao de Clientes nas Tarefas Migradas

## Problema Real
As 488 tarefas migradas **ja possuem** os clientes corretos na tabela `task_clients`. O problema e que a pagina de Tarefas busca `tasks.*` (que retorna `tasks.client_id = null` para tarefas migradas) e usa esse campo para exibir o cliente nos cards e no dialog de detalhes.

A arquitetura multi-cliente do sistema usa a tabela de juncao `task_clients`, mas o `fetchTasks` em `Tasks.tsx` ignora essa tabela.

## Correcoes

### 1. Tasks.tsx - fetchTasks (buscar clientes via task_clients)
Alterar a query de `select("*")` para incluir `task_clients(client_id)`. Apos buscar, popular `task.client_id` com o primeiro client_id encontrado em `task_clients`:

```
select("*, task_clients(client_id)")
```

No mapeamento dos resultados, setar `task.client_id` a partir de `task.task_clients[0]?.client_id` quando `task.client_id` for null.

### 2. useContentPlanning.tsx - createTasksFromItems
Apos criar cada tarefa, inserir tambem na tabela `task_clients` para que novas tarefas criadas pelo wizard de planejamento tenham o vinculo correto.

### Detalhes tecnicos
- **Nenhuma alteracao no banco de dados** -- os dados ja estao corretos em `task_clients`
- Apenas 2 arquivos serao modificados: `Tasks.tsx` e `useContentPlanning.tsx`
- A exibicao nos cards, no dialog de detalhes e nos filtros funcionara automaticamente pois todos dependem de `task.client_id`
- As 5 tarefas criadas pelo wizard de planejamento (Feb 24) que tem `tasks.client_id` preenchido mas nao tem `task_clients` tambem serao corrigidas no codigo para futuras criacoes
