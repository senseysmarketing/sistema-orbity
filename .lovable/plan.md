

# Forecast — Filtro Inteligente de Despesas (Recorrentes Ativas + Parcelas Futuras)

## Diagnóstico do problema (50 itens inflados)

A query atual é `expense_type='recorrente' OR is_fixed=true`, sem corte temporal. A dedup mantém 1 linha por `parent_expense_id ?? id`, mas:

1. **Inclui recorrentes "fantasma"** — assinaturas que tiveram lançamentos no passado mas **pararam de gerar há meses** (canceladas no app sem flag explícita, ou trocadas por outra). Ex.: mestre antigo da "Adveronix" sem `parent_expense_id` permanece `is_active=true` mesmo já tendo um novo grupo ativo.
2. **Não trata parceladas corretamente** — hoje a parcelada cai no mesmo balde de "fixos" e é deduplicada (mostra 1 só), quando o correto é **listar a parcela específica** com `due_date` no mês projetado (ex.: parcela 8/12 vence em maio/2026).
3. **Soma duplicada quando há mestre antigo + mestre novo** — query `desc` pega o mais recente de cada grupo, mas se um grupo "morto" e outro "vivo" representam a mesma assinatura com IDs diferentes, ambos contam.

## Mudanças

### 1. `useFinancialMetrics.tsx` — `recurringExpensesQuery` em duas pernas

Separar em **duas queries independentes** (executam só em forecast):

**A) Recorrentes ativas (assinaturas vivas)**
```ts
.from('expenses')
.select('*')
.eq('agency_id', agencyId)
.eq('expense_type', 'recorrente')
.eq('is_active', true)
.in('subscription_status', ['active'])  // exclui paused/canceled
.gte('due_date', sixtyDaysAgoISO)        // ← corte temporal: só grupos com lançamento nos últimos 60 dias
.order('due_date', { ascending: false })
```
- Dedup client-side por `parent_expense_id ?? id`, mantendo o lançamento mais recente.
- **Garantia anti-fantasma**: assinatura sem lançamento nos últimos 60 dias é considerada inativa de fato e não entra na projeção.

**B) Parcelas futuras (parceladas pendentes)**
```ts
.from('expenses')
.select('*')
.eq('agency_id', agencyId)
.eq('expense_type', 'parcelada')
.eq('status', 'pending')
.gte('due_date', `${selectedMonth}-01`)
.lte('due_date', `${selectedMonth}-31`)  // ajustar com endOfMonth real
```
- **Sem dedup** — cada parcela é uma linha independente que vence naquele mês exato.
- Título da linha: `${name} (${installment_current}/${installment_total})` para deixar óbvio que é uma parcela.

### 2. `forecastRecurringExpenses` — Composição final

```ts
const forecastRecurringExpenses = useMemo<Expense[]>(() => {
  const recurring = dedupBySubscription(recurringActiveQuery.data || []);
  const installments = installmentsInMonthQuery.data || [];
  return [...recurring, ...installments];
}, [recurringActiveQuery.data, installmentsInMonthQuery.data]);
```

### 3. `forecastCashFlow` — Itens projetados com label correto

Para parceladas, no `title` do item projetado:
```ts
title: e.expense_type === 'parcelada' && e.installment_total
  ? `${e.name} (${e.installment_current}/${e.installment_total})`
  : e.name
```
Para parceladas, usar o **`due_date` real** (não recalcular pelo `recurrence_day`), pois a parcela já tem data exata no banco.

### 4. Composição dos Custos (Admin.tsx) — Quebra refinada

Atualizar o card "Composição" para 3 linhas:
```
👥 Folha de Pagamento (7 ativos)        R$ 22.400,00
🔁 Assinaturas Recorrentes (X ativas)   R$ Y
📦 Parcelamentos do Mês (Z parcelas)    R$ W
─────────────────────────────────────────────────
Total Projetado                         R$ ...
```
- Contadores reais: `recurring.length` e `installments.length`.
- Linha de parcelamentos só aparece se houver parcela no mês.

## Garantias

| # | Garantia |
|---|---|
| 1 | Recorrentes "fantasma" (sem lançamento há 60+ dias) ficam de fora — corte temporal automático. |
| 2 | Parceladas projetam apenas as parcelas que **realmente vencem** no mês alvo (status `pending` + `due_date` no range). |
| 3 | Mestres antigos com novo grupo ativo não duplicam — dedup por `parent_expense_id ?? id` continua. |
| 4 | Cancelamentos/pausas (`subscription_status` paused/canceled) são respeitados. |
| 5 | Cada parcela aparece individualmente na tabela com label "X/Y" — o gestor sabe exatamente qual parcela é. |
| 6 | Sem migrations, sem RLS nova, sem edges. |

## Ficheiros alterados
- `src/hooks/useFinancialMetrics.tsx` — separar query em recorrentes ativas (com corte 60d e `subscription_status='active'`) + parcelas pendentes do mês.
- `src/pages/Admin.tsx` — card "Composição" com 3 linhas (folha, assinaturas, parcelamentos).

