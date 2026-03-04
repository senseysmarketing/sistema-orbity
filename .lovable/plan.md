

# Limpar Formulário ao Abrir Modal de Nova Tarefa

## Problema

Ao criar uma tarefa e abrir o modal novamente para criar outra, os campos mantêm os dados da tarefa anterior. O reset do `newTask` só acontece após o `handleCreateTask` com sucesso (linha 553), mas se o usuário simplesmente abre o dialog novamente via o botão "Nova Tarefa", o estado antigo permanece.

## Solução

No `onOpenChange` do Dialog (linha 940), quando `open === true` e não há `selectedTask` (não é edição), resetar o `newTask` para o estado inicial e o `createStep` para 1.

### Arquivo: `src/pages/Tasks.tsx`

**Linha 940-942**: Alterar o `onOpenChange` para resetar o formulário ao abrir:

```tsx
<Dialog open={isDialogOpen} onOpenChange={(open) => {
  setIsDialogOpen(open);
  if (!open) {
    setCreateStep(1);
  } else if (!selectedTask) {
    // Reset form when opening for new task (not edit)
    setNewTask({
      title: "", description: "", status: "todo", priority: "medium",
      assigned_to: "unassigned", assigned_users: [], client_ids: [],
      due_date: "", subtasks: [], attachments: [], task_type: "",
      platform: "", post_type: "", post_date: "", hashtags: "",
      creative_instructions: "",
    });
    setCreateStep(1);
  }
}}>
```

Alteração mínima -- apenas no handler `onOpenChange` do Dialog.

