

# Forecast 90 dias — Modo de Projeção + Antecipação de Faturamento em Lote

## Confirmações arquiteturais
- **Reuso total** do que já existe: `useFinancialMetrics`, `useCreatePayment` (`create-gateway-charge`), `FloatingActionBar`, `AdvancedFinancialSheet`. Sem novas tabelas, sem nova edge function.
- Coluna real é `monthly_value` (não `monthly_fee`) e `clients.active=true` (não `status`).
- Despesas recorrentes: `expense_type='recorrente' OR is_fixed=true`.
- Salários ativos: `employees.is_active=true`, `base_salary`.

## Mudanças

### 1. `FloatingActionBar.tsx` — Seletor com 3 meses futuros
- Gerar lista: **+3 futuros + atual + 11 passados** (15 itens), atual em destaque.
- Meses futuros recebem sufixo **" (Previsão)"** em `<span className="italic text-muted-foreground">` + ícone `CalendarClock` discreto.

### 2. `useFinancialMetrics.tsx` — Bypass de Forecast
- Derivar **`isForecastMode`** comparando `selectedMonth` (`YYYY-MM`) com o mês corrente real.
- Novas queries (executam só em forecast):
  - `recurringExpensesQuery`: `expenses` com `expense_type='recorrente' OR is_fixed=true`, ordenadas por `due_date desc`, **deduplicadas client-side por `parent_expense_id ?? id`** para não somar a mesma assinatura várias vezes.
  - `forecastClientsQuery`: clientes com `active=true AND monthly_value > 0`, ordenados por `monthly_value DESC`.
- Quando `isForecastMode === true`, **sobrescrever returns**:
  - `totalMRR = totalRevenue = expectedRevenue = Σ active_clients.monthly_value`
  - `totalPayroll = Σ active_employees.base_salary`
  - `totalExpenses = Σ recurring_expenses.amount` (excluindo folha)
  - `burnRate = totalExpenses + totalPayroll`
  - `projectedProfit / profitMargin` recalculados
  - **Zerar caixa real**: `paidRevenue=0`, `paidExpenses=0`, `paidPayroll=0`, `overdueAmount=0`, `unifiedCashFlow=[]`, `clientProfitability=[]`
- Exportar: `isForecastMode`, `forecastClients`, `forecastRecurringExpenses`.

### 3. `Admin.tsx` — Banner Quiet Luxury + ocultar widgets de caixa
- Logo abaixo do `FloatingActionBar`, quando `isForecastMode`:
  ```tsx
  <Alert className="mb-4 border-blue-200/60 bg-blue-50/40 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
    <CalendarClock className="h-4 w-4" />
    <AlertTitle className="font-medium">Modo de Projeção Ativo</AlertTitle>
    <AlertDescription>🕒 Os valores exibidos são baseados em contratos e despesas recorrentes vigentes. Valores reais podem variar.</AlertDescription>
  </Alert>
  ```
- Em forecast: ocultar `CashFlowTable` + `ClientProfitabilityCard`, substituir por hint curto: *"Tabela de fluxo de caixa fica disponível em meses com lançamentos reais. Abra Análise Avançada para a Projeção de Cobranças."*
- Passar novas props para `AdvancedFinancialSheet`: `forecastClients`, `forecastRecurringExpenses`, `employees`, `paymentsAll` (para verificação de duplicidade), `isForecastMode`.

### 4. `AdvancedFinancialSheet.tsx` — Tabs + Projeção 90 dias + Lote
Reorganizar conteúdo em **`Tabs`** (shadcn) com 2 abas:

**Aba A — "Visão Atual"** (conteúdo existente: Raio-X, YTD, Top Categorias). Mantida intacta.

**Aba B — "Projeção de Cobranças"** (sempre visível; em modo forecast vira aba padrão):

**B.1 Gráfico 90 Dias (Recharts BarChart):**
- Calcula M+1, M+2, M+3 a partir do mês corrente real.
- Por mês: `revenue = Σ forecastClients.monthly_value`, `payroll = Σ active_employees.base_salary`, `fixedCosts = Σ recurring_expenses.amount`, `cost = payroll + fixedCosts`, `margin = revenue - cost`.
- Barras agrupadas: Receita (`#475569` azul-aço) vs Custo (`#d4a574` âmbar suave). Tooltip `formatCurrency`. `ResponsiveContainer height={220}`.

**B.2 Mini-cards (3):** "MRR Garantido", "Custos Fixos Previstos", "Margem Projetada" (cor semântica) — todos para M+1.

**B.3 Tabela "Projeção de Cobranças do Mês Selecionado":**
- Visível **apenas em `isForecastMode`**.
- Colunas: **Cliente | Plano/Serviço | Valor | Status**.
- Status calculado client-side cruzando `paymentsAll`:
  - Se existe `client_payments` para `client_id` cujo `due_date` cai no **YYYY-MM** do `selectedMonth` E `status != 'cancelled'` → badge verde **"Já Faturado"** (com link `Ver Fatura` se houver `conexa_invoice_url`/`invoice_url`).
  - Caso contrário → badge cinza **"Pendente de Geração"**.
- Rodapé: total `Σ monthly_value` + contador `X de Y a faturar`.
- Empty state se nenhum cliente ativo.

**B.4 Botão crítico "Antecipar Faturamento do Lote"**:
- Acima da tabela, lado direito. Desabilitado se nenhum cliente "Pendente".
- Confirmação via `AlertDialog`: *"Vai criar N cobranças no gateway para {Mês}. Clientes já faturados serão ignorados. Continuar?"*
- Lógica de execução (sequencial, com guardrail anti-duplicidade duplo):
  ```ts
  for (const client of pendingClients) {
    // 1) Re-check ao vivo (evita race condition com webhook/cron)
    const { data: existing } = await supabase
      .from('client_payments')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('client_id', client.id)
      .gte('due_date', `${selectedMonth}-01`)
      .lte('due_date', endOfMonth)
      .neq('status', 'cancelled')
      .limit(1);
    if (existing?.length) { skipped++; continue; }
    
    // 2) Invoca edge existente
    await supabase.functions.invoke('create-gateway-charge', {
      body: {
        client_id: client.id,
        amount: client.monthly_value,
        due_date: `${selectedMonth}-${String(client.due_date).padStart(2,'0')}`,
        description: `Mensalidade ${monthLabel}`,
        billing_type: client.default_billing_type || 'manual',
        status: 'pending',
        agency_id: agencyId,
        auto_invoice: client.default_billing_type !== 'manual',
      }
    });
    created++;
  }
  ```
- Progresso visual: contador `Processando X/Y...` no botão.
- Toast final consolidado: *"{created} cobranças criadas, {skipped} já existentes ignoradas, {failed} com erro"*.
- Invalidação: `queryClient.invalidateQueries({ queryKey: ['admin-payments-all'] })` ao final.
- Coexistência com `monthly-closure` (cron de virada de mês): o cron, ao rodar, fará a mesma checagem e encontrará as cobranças já criadas — **zero duplicidade garantida nas duas pontas**.

## Garantias

| # | Garantia |
|---|---|
| 1 | Seletor mostra M+1/M+2/M+3 sufixados "(Previsão)". |
| 2 | `isForecastMode` substitui métricas de caixa por projeções (MRR + folha + recorrentes). |
| 3 | `unifiedCashFlow` zerado em forecast — sem dados inventados. |
| 4 | Banner azul translúcido — Quiet Luxury, não-alarme. |
| 5 | **Anti-duplicidade duplo**: filtro client-side na tabela + re-check `SELECT` ao vivo antes de cada `invoke`. |
| 6 | Cron de virada de mês continua intocado e seguro — vai apenas pular o que já existe. |
| 7 | Gráfico, mini-cards e tabela usam exatamente as mesmas fórmulas — coerência total. |
| 8 | Sem migrations, sem nova RLS, sem nova edge function. |

## Ficheiros alterados
- `src/components/admin/CommandCenter/FloatingActionBar.tsx`
- `src/hooks/useFinancialMetrics.tsx`
- `src/pages/Admin.tsx`
- `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`

