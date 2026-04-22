

# Forecast — Transparência de Custos + Fluxo de Caixa Projetado

## Diagnóstico do "R$ 49.355,99"

Em modo Previsão, o card "Custos do Mês" soma:
```
forecastBurnRate = forecastPayroll + forecastFixedExpenses
                 = Σ employees.base_salary (is_active=true)        ← folha
                 + Σ recurring_expenses.amount (deduplicadas)      ← assinaturas/fixos
```
A folha já aparece no card "Equipe (7 ativos)" (R$ 22.400). O restante (~R$ 26.956) são despesas recorrentes/fixas — mas **hoje não há nenhum widget que as mostre**, daí a sensação de "número que veio do nada".

## Mudanças

### 1. `useFinancialMetrics.tsx` — Construir Fluxo de Caixa Projetado
Em vez de retornar `unifiedCashFlow=[]` em forecast, **gerar uma lista projetada** a partir das fontes determinísticas:

```ts
const forecastCashFlow = useMemo<CashFlowItem[]>(() => {
  if (!isForecastMode) return [];
  const items: CashFlowItem[] = [];
  
  // Receitas projetadas — uma por cliente ativo, com due_date no mês
  forecastClients.forEach(c => {
    const day = String(Math.min(c.due_date || 5, 28)).padStart(2, '0');
    items.push({
      id: `forecast-client-${c.id}`,
      title: c.name,
      amount: c.monthly_value || 0,
      dueDate: `${selectedMonth}-${day}`,
      type: 'INCOME',
      status: 'PENDING',
      sourceType: 'client_payment',
      sourceId: c.id,
      billingType: c.default_billing_type || 'manual',
    });
  });
  
  // Despesas recorrentes/fixas projetadas
  forecastRecurringExpenses.forEach(e => {
    const originalDay = e.due_date ? e.due_date.split('-')[2] : '05';
    items.push({
      id: `forecast-expense-${e.id}`,
      title: e.name,
      amount: e.amount,
      dueDate: `${selectedMonth}-${originalDay}`,
      type: 'EXPENSE',
      status: 'PENDING',
      sourceType: 'expense',
      sourceId: e.id,
    });
  });
  
  // Folha projetada — uma linha por funcionário ativo
  employees.filter(e => e.is_active).forEach(emp => {
    const day = String(Math.min(emp.payment_day || 5, 28)).padStart(2, '0');
    items.push({
      id: `forecast-salary-${emp.id}`,
      title: `Salário - ${emp.name}`,
      amount: emp.base_salary,
      dueDate: `${selectedMonth}-${day}`,
      type: 'EXPENSE',
      status: 'PENDING',
      sourceType: 'salary',
      sourceId: emp.id,
    });
  });
  
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}, [isForecastMode, forecastClients, forecastRecurringExpenses, employees, selectedMonth]);

const out_unifiedCashFlow = isForecastMode ? forecastCashFlow : unifiedCashFlow;
```
Itens projetados têm `id` prefixado `forecast-` → o `CashFlowTable` pode detectá-los e desabilitar ações destrutivas (marcar pago, cancelar, editar).

### 2. `CashFlowTable.tsx` — Modo Read-Only com Banner "Previsão"
- Receber nova prop `isForecastMode: boolean`.
- Quando `true`:
  - **Header da tabela**: badge âmbar/azul `"PREVISÃO"` ao lado do título + tooltip *"Lançamentos projetados a partir de contratos, salários e despesas recorrentes vigentes. Nenhum dado real foi criado."*
  - **Linhas**: badge cinza `"Projetado"` no lugar do status (PAID/OVERDUE/etc), `font-style: italic` na coluna título, opacity sutil `0.85`.
  - **Menu de ações (3 pontinhos)**: ocultar todos os itens destrutivos (marcar pago, editar, cancelar, excluir, ver fatura). Manter apenas visualização.
  - Filtros de status escondidos (não fazem sentido — tudo é "Projetado").

### 3. `Admin.tsx` — Restaurar `CashFlowTable` em forecast
- Remover o bloco "EmptyForecastHint" e renderizar `<CashFlowTable>` normalmente, passando `isForecastMode={metrics.isForecastMode}`.
- Manter `ClientProfitabilityCard` oculto em forecast (sua lógica `costPerClient` baseada em accrual real não faz sentido para projeção).
- Adicionar **abaixo do banner azul** um pequeno bloco resumo "Composição dos Custos Projetados" para responder de imediato à pergunta do usuário:
  ```
  ┌─ Composição dos Custos Projetados ────────────────────┐
  │  👥 Folha de Pagamento (7 ativos)      R$ 22.400,00  │
  │  🔁 Despesas Recorrentes (12 itens)    R$ 26.955,99  │
  │  ─────────────────────────────────────────────────── │
  │  Total Projetado                       R$ 49.355,99  │
  └───────────────────────────────────────────────────────┘
  ```
  - Componente leve (`Card` shadcn), tipografia `text-sm`, ícones lucide.
  - Cada linha **clicável**: folha abre `Gerenciar Equipe`, recorrentes abrem `Central de Despesas` filtrada em `expense_type=recorrente`.
  - Contadores reais: `employees.filter(is_active).length` e `forecastRecurringExpenses.length`.

## Garantias

| # | Garantia |
|---|---|
| 1 | Usuário entende exatamente de onde vêm os R$ 49.355,99 — bloco "Composição" quebra o número em 2 fontes auditáveis. |
| 2 | Fluxo de caixa volta a aparecer em forecast, mas com badge "PREVISÃO" e linhas marcadas como `Projetado` — sem confusão com dados reais. |
| 3 | Ações destrutivas (marcar pago, editar, cancelar) são desabilitadas em itens projetados — impossível corromper dados. |
| 4 | Nada é gravado no banco. Itens projetados existem apenas no estado React, com `id` prefixado `forecast-`. |
| 5 | Cron de virada de mês continua intocado — quando rodar, criará registros reais que substituirão os projetados naturalmente. |
| 6 | Sem migrations, sem RLS nova, sem edges. |

## Ficheiros alterados
- `src/hooks/useFinancialMetrics.tsx` — gera `forecastCashFlow` em vez de array vazio.
- `src/components/admin/CommandCenter/CashFlowTable.tsx` — prop `isForecastMode`, badge "PREVISÃO", linhas read-only.
- `src/pages/Admin.tsx` — restaura `CashFlowTable` em forecast + novo bloco "Composição dos Custos Projetados".

