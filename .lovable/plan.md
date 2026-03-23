

# Exclusao Inteligente de Despesas (Recorrente vs Unica)

## Estado atual

- `ExpenseDetailsDialog` ja tem botao "Excluir" + AlertDialog simples (mesmo texto para todos os tipos)
- `ExpenseForm` NAO tem botao de exclusao
- `Admin.tsx` tem `confirmDeleteExpense` que faz `DELETE` direto no banco
- A logica nao diferencia entre despesa unica, parcelada ou recorrente

## Alteracoes

### 1. `ExpenseForm.tsx` — Adicionar botao Excluir + AlertDialog inteligente

No `DialogFooter` (linha 467), quando `expense` existir (modo edicao):
- Adicionar botao "Excluir" (ghost, icone Trash2, cor destructive) ao lado esquerdo
- Ao clicar, abrir AlertDialog com logica condicional:

**Cenario A** (`expense_type !== 'recorrente'` e sem `parent_expense_id`):
- Titulo: "Excluir Despesa"
- Texto padrao: "Tem certeza? Esta acao nao pode ser desfeita."
- Botao: "Excluir" → chama `onDelete(expense)` (novo callback via props)

**Cenario B** (`expense_type === 'recorrente'` OU `parent_expense_id` presente):
- Titulo: "Excluir Despesa Recorrente"
- Texto: "Esta despesa faz parte de uma recorrencia. O que deseja fazer?"
- Botao 1: "Apagar apenas esta" → chama `onDeleteInstance(expense)` (marca como cancelled ou deleta so esta)
- Botao 2: "Cancelar Assinatura" → chama `onCancelSubscription(expense)` (deleta/cancela esta + `is_active: false` no pai)

Props novas no ExpenseForm: `onDelete`, `onDeleteInstance`, `onCancelSubscription`

### 2. `ExpenseDetailsDialog.tsx` — Melhorar AlertDialog existente (linhas 468-492)

Mesmo padrão do ExpenseForm:
- Se `expense_type === 'recorrente'` ou `parent_expense_id` existir → mostrar AlertDialog com 2 opcoes
- Senao → manter AlertDialog simples atual

### 3. `Admin.tsx` — Implementar handlers de exclusao inteligente

Adicionar 2 novos handlers:

**`handleDeleteExpenseInstance(expense)`**: Marca apenas a instancia como `cancelled` (status = 'cancelled') em vez de deletar, para manter historico.

**`handleCancelExpenseSubscription(expense)`**: 
1. Marca a instancia atual como `cancelled`
2. Busca o `parent_expense_id` (ou usa o proprio `id` se for a mestra)
3. Faz `UPDATE expenses SET is_active = false WHERE id = parentId`
4. Invalida queries

Passar esses handlers como props para `ExpenseForm` e `ExpenseDetailsDialog`.

## Arquivos modificados
- `src/components/admin/ExpenseForm.tsx` — botao excluir + AlertDialog inteligente
- `src/components/admin/ExpenseDetailsDialog.tsx` — AlertDialog com 2 cenarios
- `src/pages/Admin.tsx` — novos handlers de exclusao

