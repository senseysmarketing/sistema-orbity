

# Correção: Cards HeroMetrics desalinhados com Fluxo de Caixa

## Diagnóstico com dados reais

Confirmei via query que existem **3 clientes cancelados em abril** com pagamentos `pending` no mês:
- ANZ Imóveis: R$ 1.490 (cancelled_at: 01/04)
- Ayub Malach: R$ 1.090 (cancelled_at: 01/04)
- T&B Negócios: R$ 597 (cancelled_at: 01/04)
- **Total: R$ 3.177** (exatamente o valor de Churn exibido)

### Bug 1: Faturamento inflado (R$ 34.878 vs R$ 31.701)
`expectedRevenue` soma TODOS os pagamentos não-cancelados do mês, incluindo os de clientes inativos. Mas o Fluxo de Caixa filtra por `wasClientActiveInMonth`, excluindo esses 3 clientes. Diferença = R$ 3.177.

### Bug 2: Inadimplência fantasma (R$ 2.390 no card, 0 no fluxo)
Dois problemas combinados:
- `overdueAmount` inclui pagamentos de clientes inativos que o fluxo de caixa não mostra
- O filtro "Atrasados" do fluxo de caixa só mostra `status === 'OVERDUE'`, ignorando items `PENDING` com vencimento passado

### Bug 3: Filtro "Atrasados" incompleto no Fluxo de Caixa
Na `CashFlowTable.tsx` linha 46: `item.status === 'OVERDUE'` — só mostra items já marcados como "overdue" no banco, ignorando pendentes vencidos.

## Alterações

### 1. `src/hooks/useFinancialMetrics.tsx`

**expectedRevenue** (linhas 321-326): Filtrar por `wasClientActiveInMonth`, alinhando com o fluxo de caixa:

```typescript
const expectedRevenue = useMemo(() => {
  return paymentsInMonth
    .filter(p => {
      if (p.status === 'cancelled') return false;
      const client = clients.find(c => c.id === p.client_id);
      return client && wasClientActiveInMonth(client, selectedMonth);
    })
    .reduce((sum, p) => sum + p.amount, 0);
}, [paymentsInMonth, clients, selectedMonth]);
```

**overdueAmount** (linhas 312-318): Mesmo filtro de cliente ativo:

```typescript
const overdueAmount = useMemo(() => {
  return paymentsInMonth
    .filter(p => {
      if (!['overdue', 'pending'].includes(p.status)) return false;
      if (p.due_date >= today) return false;
      const client = clients.find(c => c.id === p.client_id);
      return client && wasClientActiveInMonth(client, selectedMonth);
    })
    .reduce((sum, p) => sum + p.amount, 0);
}, [paymentsInMonth, clients, selectedMonth, today]);
```

### 2. `src/components/admin/CommandCenter/CashFlowTable.tsx`

**Filtro "Atrasados"** (linha 46): Incluir items PENDING com vencimento passado:

```typescript
if (filter === 'overdue') {
  const todayStr = new Date().toISOString().split('T')[0];
  return item.status === 'OVERDUE' || 
    (item.status === 'PENDING' && item.dueDate < todayStr);
}
```

**overdueCount** (linha 59): Mesma lógica para o contador no botão:

```typescript
const todayStr = new Date().toISOString().split('T')[0];
const overdueCount = cashFlow.filter(i => 
  i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueDate < todayStr)
).length;
```

## Resultado esperado

- Card "Faturamento" mostrará R$ 31.701 (igual ao fluxo de caixa)
- Card "Inadimplência" mostrará apenas atrasos de clientes ativos
- Botão "Atrasados" no fluxo de caixa mostrará pendentes vencidos
- Tudo consistente entre cards e tabela

