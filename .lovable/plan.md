

# Sheet "Análise Avançada" — Aba Projeção 90 dias zerada

## Diagnóstico

A aba "Projeção (90 dias)" no `AdvancedFinancialSheet` mostra **R$ 0,00** em tudo (gráfico, MRR Garantido, Custos Fixos Previstos, Margem Projetada).

**Causa raiz**: as queries `recurringActiveQuery` e `installmentsInMonthQuery` em `useFinancialMetrics.tsx` estão habilitadas **somente quando `isForecastMode=true`**, e `isForecastMode` é definido como `selectedMonth > currentMonthStr`.

Hoje é abril/2026 e o mês selecionado é abril/2026 → `isForecastMode=false` → as queries de forecast nem rodam → `forecastClients=[]` e `forecastRecurringExpenses=[]` chegam vazios na sheet → gráfico e mini-cards renderizam zero.

A aba "Projeção 90 dias", porém, é **sempre sobre os próximos 3 meses a partir de HOJE**, independente do mês selecionado no FloatingActionBar. Portanto os dados não deveriam depender de `isForecastMode`.

## Correção

### 1. `src/hooks/useFinancialMetrics.tsx`
- Trocar `enabled: !!agencyId && isForecastMode` para `enabled: !!agencyId` em:
  - `recurringActiveQuery` (linha ~290)
  - `installmentsInMonthQuery` (linha ~310)
- Justificativa: o custo é baixo (poucas linhas mestras + parcelas do mês), e os dados são necessários tanto para a sheet quanto para o modo forecast quando ativo.
- Manter intacto: `forecastCashFlow` continua retornando `[]` quando `!isForecastMode` — não impacta a sheet, que só usa `forecastClients` e `forecastRecurringExpenses` para o gráfico/mini-cards.

### 2. `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`
- A `installmentsInMonthQuery` filtra parcelas pelo `selectedMonth`, mas a aba 90 dias precisa de parcelas dos **3 próximos meses reais**. Para o cálculo do gráfico (que hoje aplica o mesmo `Custo` em M+1, M+2, M+3), suficiente como está — usa apenas as recorrentes ativas + folha. Parcelas pontuais ficam de fora intencionalmente do gráfico genérico (caso contrário mascararíamos meses sem parcela). Sem mudança aqui.

## Garantias

| # | Garantia |
|---|---|
| 1 | A aba "Projeção 90 dias" passa a mostrar valores reais mesmo com mês selecionado = mês atual ou passado. |
| 2 | Modo forecast (mês futuro selecionado) continua funcionando — usa as mesmas queries agora sempre habilitadas. |
| 3 | Sem custo extra significativo: 1 query de mestres ativos + 1 query de parcelas do mês selecionado. |
| 4 | Sem migrations, sem mudança em RLS, sem edges. |

## Ficheiros alterados
- `src/hooks/useFinancialMetrics.tsx` — remover gate `isForecastMode` das queries de forecast.

