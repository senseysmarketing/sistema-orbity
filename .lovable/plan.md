
# Correção: Contagem de Tarefas — Somente Atribuídas ao Usuário

## Problema Atual

A query de tarefas usa dois critérios combinados com OR:
```typescript
taskQuery.or(`id.in.(${myTaskIds.join(',')}),created_by.eq.${profile.user_id}`)
```

Isso significa que **qualquer tarefa criada pelo usuário** entra na lista, mesmo que ele não esteja atribuído a ela. Um admin que criou 40 tarefas para outros membros da equipe veria todas elas no próprio dashboard — causando a contagem inflada de "39 de 41 tarefas".

## Solução

Simplificar a query para buscar **apenas** as tarefas onde o usuário está atribuído em `task_assignments`. Se não houver atribuições, retornar lista vazia em vez de tarefas criadas.

```typescript
// ANTES — pega tarefas atribuídas OU criadas pelo usuário
if (myTaskIds.length > 0) {
  taskQuery = taskQuery.or(`id.in.(${myTaskIds.join(',')}),created_by.eq.${profile.user_id}`);
} else {
  taskQuery = taskQuery.eq('created_by', profile.user_id);
}

// DEPOIS — pega SOMENTE tarefas atribuídas ao usuário
if (myTaskIds.length > 0) {
  taskQuery = taskQuery.in('id', myTaskIds);
} else {
  // Sem atribuições = sem tarefas no dashboard pessoal
  setMyTasks([]);
  // (pula a query)
}
```

## Arquivo a Modificar

`src/pages/Index.tsx` — bloco de construção da query de tarefas (linhas 76-86)

## Impacto

| Situação | Antes | Depois |
|----------|-------|--------|
| Admin criou 40 tarefas, está atribuído em 2 | Mostra 42 tarefas | Mostra 2 tarefas |
| Usuário sem atribuições, criou 5 tarefas | Mostra 5 tarefas | Mostra 0 tarefas |
| Usuário atribuído em 3 tarefas | Mostra 3 tarefas | Mostra 3 tarefas ✅ |

O dashboard passa a ser um reflexo fiel somente do que foi **delegado/atribuído** ao usuário — que é o comportamento esperado de um "Meu Dia" pessoal.
