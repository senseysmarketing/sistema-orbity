

# Refatoração: Métricas baseadas em Fluxo de Caixa Real

## Diagnóstico

Analisei o código atual. O `expectedRevenue` (linha 321) **já** soma de `paymentsInMonth` e não de `clients.monthly_value`. Porém há dois problemas reais:

1. **Inadimplência incompleta**: `delinquencyRate` (linha 311) só filtra `status === 'overdue'`, ignorando faturas com `status === 'pending'` cuja `due_date` já passou — essas também são atrasos reais.

2. **Filtro desnecessário por cliente ativo**: A inadimplência filtra por `wasClientActiveInMonth`, o que pode excluir faturas reais de clientes cancelados que ainda devem.

3. **Receita recebida**: `paidRevenue` usa `amount_paid || amount`, o que é correto para capturar o valor real pago (com desconto/juros).

## Alterações

### 1. `src/hooks/useFinancialMetrics.tsx`

**Inadimplência** (linhas 310-318): Reescrever para incluir pagamentos `pending` OU `overdue` com `due_date < hoje`, sem filtro de cliente ativo:

```typescript
const today = new Date().toISOString().split('T')[0];

const overdueAmount = useMemo(() => {
  return paymentsInMonth
    .filter(p => 
      (p.status === 'overdue' || p.status === 'pending') && 
      p.due_date < today
    )
    .reduce((sum, p) => sum + p.amount, 0);
}, [paymentsInMonth, today]);
```

Renomear `delinquencyRate` → `overdueAmount` internamente para clareza (o nome `delinquencyRate` é confuso pois é um valor absoluto, não uma taxa).

Atualizar `overdueRate` para usar o novo `overdueAmount`.

### 2. `src/pages/Admin.tsx`

Atualizar a prop `overdueAmount` para usar o nome correto do hook (se renomeado).

### Sem alterações em HeroMetrics.tsx
O componente visual já está correto. A correção é puramente na lógica de cálculo.

