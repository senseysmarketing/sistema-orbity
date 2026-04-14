

# Refatoracao UX: Elevar ferramentas para FloatingActionBar

## Resumo
Remover botoes de gestao dos componentes internos e centraliza-los na FloatingActionBar, com estados orquestrados no Admin.tsx.

## Alteracoes

### 1. AdvancedFinancialSheet.tsx
- Remover: estado `billingRulerOpen`, import `BillingAutomationSettings`, import `Bell`, import `Button`, botao "Regua de Cobranca" (linhas 176-184), componente `<BillingAutomationSettings>` (linha 187)

### 2. ClientProfitabilityCard.tsx
- Remover: prop `onOpenManagement` da interface e destructuring, bloco condicional do botao "Gerenciar Carteira" (linhas 41-45), import `Button`

### 3. CashFlowTable.tsx
- Remover: estado `expenseSheetOpen`, import `AdvancedExpenseSheet`, botao "Central de Despesas" (linhas 324-326), componente `<AdvancedExpenseSheet>` (linhas 403-411)
- O titulo "Top Categorias de Custo" fica sem botao ao lado

### 4. FloatingActionBar.tsx
- Adicionar 3 props opcionais: `onOpenPortfolio`, `onOpenBillingRuler`, `onOpenExpenseCentral`
- Importar `Users`, `Bell` de lucide-react (Receipt ja existe)
- Inserir 3 botoes de gestao (variant="outline", size="sm") entre o month selector e os botoes de criacao, com labels em `<span className="hidden md:inline">`
- Ordem: Gerenciar Carteira (Users) | Regua de Cobranca (Bell) | Central de Despesas (Receipt)
- Separador visual via `border-r pr-2` no grupo de gestao

### 5. Admin.tsx
- Adicionar estados: `isBillingRulerOpen`, `isExpenseCentralOpen`
- Importar `BillingAutomationSettings` e `AdvancedExpenseSheet`
- Passar novas props ao FloatingActionBar: `onOpenPortfolio`, `onOpenBillingRuler`, `onOpenExpenseCentral`
- Remover `onOpenManagement` do ClientProfitabilityCard
- Renderizar ao lado do ClientManagementSheet:
  - `<BillingAutomationSettings open={isBillingRulerOpen} onOpenChange={setIsBillingRulerOpen} />`
  - `<AdvancedExpenseSheet open={isExpenseCentralOpen} onOpenChange={setIsExpenseCentralOpen} cashFlow={metrics.unifiedCashFlow} expensesByCategory={metrics.expensesByCategory} agencyId={currentAgency?.id || ""} selectedMonth={selectedMonth} onEditExpense={handleEditExpenseById} />`

## Arquivos alterados
1. `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`
2. `src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`
3. `src/components/admin/CommandCenter/CashFlowTable.tsx`
4. `src/components/admin/CommandCenter/FloatingActionBar.tsx`
5. `src/pages/Admin.tsx`

