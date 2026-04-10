

# Central de Despesas — Refatoracao + Sheet Lateral

## Resumo
Modernizar o card "Top Categorias de Custo" com barras de progresso percentuais e adicionar botao para abrir nova "Central de Despesas" em Sheet lateral com 3 abas.

## Arquivos

### 1. `src/components/admin/CommandCenter/CashFlowTable.tsx`
- Refatorar o bloco "Top Categorias de Custo" (linhas 209-233):
  - Calcular percentual de cada categoria sobre o total de despesas (nao sobre o max)
  - Exibir formato: "Marketing (R$ 5.000) [=====] 45%"
  - Adicionar botao "Central de Despesas" no CardHeader ao lado do titulo
  - Novo estado `isExpenseSheetOpen` para controlar o Sheet
  - Renderizar `<AdvancedExpenseSheet>` passando `cashFlow`, `expensesByCategory`, `agencyId`, `selectedMonth`

### 2. `src/components/admin/CommandCenter/AdvancedExpenseSheet.tsx` (NOVO)
- Sheet lateral com `sm:max-w-[800px]`, titulo "Central de Contas a Pagar"
- 3 abas via `<Tabs>`:

**Aba 1 — Contas do Mes:**
- Filtrar `cashFlow` onde `type === 'EXPENSE'` e `status !== 'CANCELLED'` (ja inclui despesas + salarios pelo `useFinancialMetrics`)
- Tabela com colunas: Vencimento, Descricao, Categoria (badge), Valor, Status (badge colorido)
- Totalizar pendente vs pago no topo

**Aba 2 — Assinaturas Ativas:**
- Query separada: buscar `expenses` onde `expense_type = 'recorrente'` e `is_active = true` da agencia
- Exibir valor mensal comprometido no topo como KPI
- Lista com nome, categoria, valor mensal, dia de recorrencia

**Aba 3 — Parcelamentos:**
- Query separada: buscar `expenses` onde `expense_type = 'parcelada'` com parcelas restantes
- Barra de progresso: `installment_current / installment_total`
- Formato: "Macbook - Parcela 3 de 10"

### 3. Nenhuma migration necessaria
Os campos `expense_type` (enum: avulsa/recorrente/parcelada), `installment_current`, `installment_total`, `recurrence_day`, `is_active` ja existem na tabela `expenses`.

## Consistencia visual
Seguir o padrao do `AdvancedFinancialSheet.tsx`: mesmos componentes Card, Progress, Badge, formatCurrency, icones Lucide.

