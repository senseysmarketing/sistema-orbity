
# Tornar o Campo "Tipo" Obrigatório nas Tarefas

## Problema

O campo "Tipo" exibe asterisco (*) indicando obrigatoriedade, mas as funções `handleCreateTask` e `handleUpdateTask` não validam se o tipo foi selecionado antes de salvar.

## Solução

Adicionar validação do campo `task_type` nas duas funções de salvamento, e também adicionar o asterisco no modal de edição (que está sem).

## Arquivo a Modificar

`src/pages/Tasks.tsx`

## Alterações

### 1. Validação na criação (handleCreateTask - linha ~456)

Após a validação do título, adicionar:

```typescript
if (!newTask.task_type) {
  toast({
    title: "Erro",
    description: "O tipo da tarefa é obrigatório.",
    variant: "destructive",
  });
  return;
}
```

### 2. Validação na edição (handleUpdateTask - linha ~587)

Mesma validação após o check do título:

```typescript
if (!newTask.task_type) {
  toast({
    title: "Erro",
    description: "O tipo da tarefa é obrigatório.",
    variant: "destructive",
  });
  return;
}
```

### 3. Adicionar asterisco no modal de edição (linha ~1265)

Mudar de:
```tsx
<Label htmlFor="edit-task_type">Tipo</Label>
```
Para:
```tsx
<Label htmlFor="edit-task_type">Tipo *</Label>
```

## Resultado

- Criar tarefa sem tipo selecionado mostra mensagem de erro
- Editar tarefa e salvar sem tipo mostra mensagem de erro
- Ambos os modais mostram asterisco no campo Tipo
