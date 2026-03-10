

# Bug Crítico: Atribuições de Tarefas Desaparecendo

## Causa Raiz (3 bugs encontrados)

### Bug 1 — Limite de 1000 linhas do Supabase
A tabela `task_assignments` tem **1047 registros**. O Supabase retorna no máximo 1000 por query. Quando `fetchAssignments()` é chamado sem filtro (na inicialização e no realtime listener), **47 atribuições são silenciosamente descartadas**. Tarefas cujas atribuições caem fora do limite aparecem sem responsável.

### Bug 2 — `fetchAssignments(taskId)` substitui TODO o estado
Quando `assignUsersToTask` chama `fetchAssignments(taskId)` na linha 130, a função faz `setAssignments(combinedData)` — substituindo **todas** as atribuições no estado por apenas as da tarefa editada. Resultado: todas as outras tarefas perdem seus responsáveis na UI instantaneamente.

### Bug 3 — Atualização otimista destrutiva
Na linha 107, `setAssignments(newAssignments)` substitui o array inteiro por apenas os novos assignments de uma tarefa, apagando todas as outras atribuições do estado.

## Solução

**Arquivo:** `src/hooks/useTaskAssignments.tsx`

### 1. Corrigir limite de 1000 linhas
Usar paginação ou `.range()` para buscar todas as atribuições. Como temos ~1000, podemos fazer uma query com limite explícito maior ou paginar em blocos.

### 2. Corrigir `fetchAssignments(taskId)` para fazer merge
Quando buscar atribuições de uma tarefa específica, fazer merge no estado existente em vez de substituir tudo. Remover do estado as atribuições da task alvo e adicionar as novas.

### 3. Corrigir atualização otimista para fazer merge
Na atualização otimista, filtrar as atribuições existentes removendo apenas as da tarefa sendo editada, e então adicionar as novas.

### Mudanças específicas:

```
fetchAssignments(taskId):
  - Sem taskId: buscar com .range(0, 4999) para cobrir todas
  - Com taskId: buscar só da task, e fazer MERGE no estado:
    setAssignments(prev => [
      ...prev.filter(a => a.task_id !== taskId),
      ...novasAtribuicoes
    ])

assignUsersToTask - otimista:
  setAssignments(prev => [
    ...prev.filter(a => a.task_id !== taskId),
    ...newAssignments
  ])
```

### Arquivo único alterado:
- `src/hooks/useTaskAssignments.tsx`

