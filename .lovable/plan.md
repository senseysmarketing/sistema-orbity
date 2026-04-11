

# Adicionar Botões de Edição na Central de Contas a Pagar

## Problema
Os cards de assinaturas (SaaS Tracker) e parcelamentos na `AdvancedExpenseSheet` não possuem botões de edição. O `ExpenseForm` só é acessível pela tabela de fluxo de caixa na página Admin principal.

## Solução

### Arquivo: `AdvancedExpenseSheet.tsx`

1. **Adicionar callbacks na interface do componente**:
   - `onEditExpense?: (expenseId: string) => void` — callback que o componente pai (Admin.tsx) usará para abrir o ExpenseForm com a despesa selecionada.

2. **Botão de edição nos cards de Assinatura (SubscriptionCard)**:
   - Adicionar um ícone de lápis (`Pencil`) clicável ao lado do nome ou dos controles existentes (Play/Switch).
   - Ao clicar, chama `onEditExpense(exp.id)`.

3. **Botão de edição nos cards de Parcelamento**:
   - Adicionar o mesmo ícone de lápis em cada card de parcelamento.
   - Ao clicar, chama `onEditExpense(exp.id)`.

4. **Botão de edição na tabela "Contas do Mês"**:
   - Adicionar uma coluna de ações na tabela com ícone de edição para cada linha de despesa.

### Arquivo: `Admin.tsx`

5. **Passar o callback para o AdvancedExpenseSheet**:
   - Criar handler que busca a despesa pelo ID, seta `selectedExpense` e abre o `ExpenseForm`.
   - Passar como prop `onEditExpense` para o `AdvancedExpenseSheet`.

## Arquivos modificados
- `src/components/admin/CommandCenter/AdvancedExpenseSheet.tsx`
- `src/pages/Admin.tsx`

