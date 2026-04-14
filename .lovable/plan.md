

# Correção: Lucratividade de Caixa com burnRate inconsistente

## Problema

A lucratividade de caixa está usando:
- **Receita**: apenas pagamentos com `status === 'paid'` ✅
- **Custos**: TODOS os custos (pagos + pendentes + vencidos) ❌

Isso gera -R$ 26.537 porque compara R$ 5.921 recebidos contra R$ 32.458 de custos totais.

## Solução

Criar um `paidBurnRate` que soma apenas despesas e salários com `status === 'paid'`, e usá-lo no cálculo de `realProfitability`.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useFinancialMetrics.tsx` | Criar `paidExpenses`, `paidPayroll`, `paidBurnRate` (filtrando `status === 'paid'`). Usar `paidBurnRate` em `realProfitability` |

### Lógica

```typescript
const paidExpenses = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0);
const paidPayroll = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0);
const paidBurnRate = paidExpenses + paidPayroll;

const realProfitability = paidRevenue - paidBurnRate;
const realProfitabilityMargin = paidRevenue > 0 ? (realProfitability / paidRevenue) * 100 : 0;
```

A lucratividade **Prevista** (competência) continua usando `burnRate` total vs MRR — sem alteração.

