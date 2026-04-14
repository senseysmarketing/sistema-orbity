

# Correção: Lucratividade usando regime errado

## Problema

A **Lucratividade** no Hero Metrics está sendo calculada como:

```
profitability = totalMRR - burnRate
```

Onde `totalMRR` é a soma dos `monthly_value` de todos os clientes ativos (receita **contratada/prevista**), não a receita **efetivamente recebida**. Isso gera um número enganoso — mostra R$ 891 positivo quando na realidade só foram recebidos R$ 5.921 contra R$ 32.458 de custos.

## Solução

Exibir **duas visões** da lucratividade no card, alinhado com a lógica de Regime de Caixa vs Competência que o sistema já documenta no `FinancialMetricsHelp`:

1. **Lucratividade Real (Caixa)** = Receita efetivamente paga no mês (`status === 'paid'`) - Custos pagos
2. **Lucratividade Prevista (Competência)** = MRR contratado - Custos totais (o cálculo atual)

O valor principal exibido será o de **Caixa** (real), com o de Competência como texto secundário.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/hooks/useFinancialMetrics.tsx` | Adicionar `paidRevenue` (soma de `amount_paid` dos pagamentos `paid` no mês) e `realProfitability` = `paidRevenue - burnRate` |
| `src/components/admin/CommandCenter/HeroMetrics.tsx` | Card "Lucratividade" exibe `realProfitability` como valor principal, com subtexto "Previsto: R$ X" mostrando a lucratividade por competência |
| `src/pages/Admin.tsx` | Passar os novos campos para `HeroMetrics` |

## Detalhes técnicos

No `useFinancialMetrics.tsx`, já existe o filtro `paymentsInMonth.filter(p => p.status === 'paid')` para gateway fees. Reutilizar essa lógica para calcular a receita efetiva, priorizando `amount_paid` sobre `amount` (conforme memória de resiliência).

```typescript
const paidRevenue = paymentsInMonth
  .filter(p => p.status === 'paid')
  .reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);

const realProfitability = paidRevenue - burnRate;
```

O card de Lucratividade mostrará:
- **Valor grande**: `realProfitability` (regime de caixa)
- **Badge**: margem % sobre `paidRevenue`
- **Subtexto**: "Previsto: R$ X" (regime de competência, o cálculo atual MRR - burnRate)

