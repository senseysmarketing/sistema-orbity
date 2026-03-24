

# Conectar SalarySheet e Remover SalaryDetailsDialog

## Diagnostico

O `SalarySheet` ja esta renderizado corretamente em Admin.tsx (linha 449) e o `salaryFormOpen` ja e acionado tanto pelo CashFlowTable (linha 402-404) quanto pelo `handleEditSalary`. O problema e que o `SalaryDetailsDialog` antigo ainda esta na arvore de renderizacao, e o `handleViewSalary` ainda aponta para ele — embora nao seja chamado em nenhum componente filho atualmente.

## Alteracoes em `src/pages/Admin.tsx`

### 1. Remover SalaryDetailsDialog da arvore de renderizacao
- Remover import do `SalaryDetailsDialog` (linha 26)
- Remover state `salaryDetailsOpen` (linha 65)
- Remover `handleViewSalary` (linha 278) — nao e usado em nenhum componente
- Remover o bloco `<SalaryDetailsDialog ... />` (linhas 492-498)

### 2. Redirecionar qualquer referencia residual
- Alterar `handleViewSalary` (se mantido) para abrir o SalarySheet em vez do dialog antigo: `setSalaryFormOpen(true)` em vez de `setSalaryDetailsOpen(true)`

Nenhum outro arquivo precisa de alteracao — os triggers do CashFlowTable e TeamSection ja apontam para `setSalaryFormOpen` corretamente.

## Arquivos
- `src/pages/Admin.tsx` (remover import, state e renderizacao do SalaryDetailsDialog)

