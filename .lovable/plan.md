

# Refatoração: HeroMetrics com visão DRE/Fluxo de Caixa

## Problema
Os cards misturam MRR (receita contratada) com fluxo de caixa real, gerando confusão ao cancelar faturas.

## Alterações

### 1. `src/hooks/useFinancialMetrics.tsx`
Adicionar duas novas métricas calculadas e renomear exports:

- **`expectedRevenue`**: soma dos `amount` de `paymentsInMonth` com status != `cancelled` (faturamento real do mês)
- **`receivedRevenue`**: já existe como `paidRevenue`
- **`expectedExpenses`**: já existe como `burnRate` (totalExpenses + totalPayroll, excluindo cancelled)
- **`paidExpensesCash`**: já existe como `paidBurnRate`
- **`projectedProfit`**: `expectedRevenue - expectedExpenses`
- **`profitMargin`**: `(projectedProfit / expectedRevenue) * 100`
- **`overdueAmount`**: já existe como `delinquencyRate` (nome confuso, é valor absoluto)
- **`overdueRate`**: `(overdueAmount / expectedRevenue) * 100`

Adicionar ao return: `expectedRevenue`, `projectedProfit`, `profitMargin`, `overdueRate`.

### 2. `src/components/admin/CommandCenter/HeroMetrics.tsx`
Reescrever interface e cards conforme especificação:

| Card | Valor Principal | Badge |
|------|----------------|-------|
| Faturamento do Mês | `expectedRevenue` | Recebido: `receivedRevenue` (verde) |
| Custos do Mês | `expectedExpenses` | Pago: `paidExpenses` (neutro) |
| Lucratividade Projetada | `projectedProfit` | `profitMargin%` (verde/vermelho) |
| Inadimplência (Atrasos) | `overdueAmount` | `overdueRate%` (vermelho se > 0) |

### 3. `src/pages/Admin.tsx`
Atualizar as props passadas ao `<HeroMetrics>` para usar as novas variáveis do hook.

