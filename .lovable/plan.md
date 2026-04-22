

# Correção — Aba "Projeção (90 dias)" zerada na Análise Avançada

## Causa raiz

Há **duas instâncias** do `<AdvancedFinancialSheet>` montadas no app:

1. `src/pages/Admin.tsx` (linha 542) — recebe **todos** os props (`forecastClients`, `forecastRecurringExpenses`, `employees`, `paymentsAll`, `isForecastMode`). ✅
2. `src/components/admin/CommandCenter/CashFlowTable.tsx` (linha 424) — recebe **apenas** `cashFlow`, `expensesByCategory`, `agencyId`, `selectedMonth`. ❌

O botão "Análise Avançada" dentro do `CashFlowTable` (linha 212) abre a instância **local**, que está sem os dados de forecast. Como `forecastClients`, `forecastRecurringExpenses` e `employees` caem nos defaults `[]`, o cálculo retorna:

- `totalForecastMRR = 0` → gráfico mostra Receita R$0
- `totalActivePayroll = 0` + `totalForecastFixed = 0` → gráfico mostra Custo R$0
- Mini-cards: MRR Garantido R$0, Custos Fixos R$0, Margem R$0

Daí a tela vazia que aparece em abril/2026.

## Correção

### Opção única e limpa: remover a instância duplicada do `CashFlowTable` e elevar o controle de abertura para `Admin.tsx`

`src/components/admin/CommandCenter/CashFlowTable.tsx`:
- Adicionar prop `onOpenAdvanced: () => void`.
- Remover o estado local `advancedOpen` e a montagem do `<AdvancedFinancialSheet>` (linhas 424–431).
- O botão "Análise Avançada" (linha 212) chama `onOpenAdvanced()` em vez de `setAdvancedOpen(true)`.

`src/pages/Admin.tsx`:
- Passar `onOpenAdvanced={() => setIsAdvancedFinancialOpen(true)}` para o `<CashFlowTable>` (já tem `isAdvancedFinancialOpen` no escopo).
- Manter a única instância já montada na linha 542 — ela já recebe todos os props corretos.

### Resultado

- Clicar em "Análise Avançada" no CashFlowTable abre a sheet **com** os dados completos.
- Aba "Projeção (90 dias)" mostra:
  - Gráfico de barras dos 3 meses seguintes (Mai/26, Jun/26, Jul/26) com Receita = MRR ativa e Custo = folha + recorrentes.
  - Mini-cards "MRR Garantido", "Custos Fixos Previstos" e "Margem Projetada" com os valores reais.
- Sem regressão na "Visão Atual" (mesmos props de antes).

## Arquivos alterados

- `src/components/admin/CommandCenter/CashFlowTable.tsx` — remover instância duplicada e estado local; aceitar prop `onOpenAdvanced`.
- `src/pages/Admin.tsx` — passar `onOpenAdvanced` ao `<CashFlowTable>`.

## Sem mudanças

- `AdvancedFinancialSheet.tsx`, `useAdvancedAnalytics`, `useFinancialMetrics`, queries, RLS — intactos.

