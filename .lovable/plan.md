

# Refatoracao Admin.tsx → Centro de Comando Financeiro

## Escopo e Diretrizes

Transformar a pagina Admin.tsx (3331 linhas, Tabs) em um Command Center unificado com as 4 diretrizes adicionais:
1. **Sem Dialog dentro de Sheet** -- extrair conteudo dos forms como componentes puros
2. **markAsPaid com Popover** -- data do pagamento + valor pago antes de confirmar
3. **Despesas agrupadas por categoria** no hook
4. **selectedMonth como filtro global** consumido pelo hook

---

## Arquivos a Criar

### 1. `src/hooks/useFinancialMetrics.tsx`
Hook centralizado que recebe `agencyId` e `selectedMonth` como parametros.

**Queries (useQuery):**
- `clients` -- todos os clientes da agencia (sem filtro de mes)
- `paymentsAll` -- todos os pagamentos (para MRR e historico)
- `paymentsMonth` -- pagamentos do mes selecionado
- `expensesMonth` -- despesas do mes selecionado
- `salariesMonth` -- salarios do mes selecionado
- `employees` -- funcionarios
- `expenseCategories` -- categorias de despesas
- `previousMonthExpenses` / `previousMonthSalaries` -- para comparacao

**Calculos (useMemo):**
- `totalMRR` -- soma monthly_value dos clientes ativos
- `totalExpenses` -- soma despesas do mes
- `totalPayroll` -- soma salarios do mes
- `burnRate` = totalExpenses + totalPayroll
- `profitability` = totalMRR - burnRate
- `profitabilityMargin` = (profitability / totalMRR) * 100
- `delinquencyRate` -- soma pagamentos overdue do mes
- `expensesByCategory` -- Map<string, number> agrupando despesas por categoria
- `unifiedCashFlow` -- array tipada `{ id, title, amount, dueDate, type: 'INCOME'|'EXPENSE', status: 'PAID'|'PENDING'|'OVERDUE', sourceType: 'client_payment'|'expense'|'salary', sourceId }` ordenada por dueDate
- `clientProfitability` -- para cada cliente ativo: fee, estimatedCost (totalPayroll / nClientes), margin, isAtRisk (margin < 30%)

**Mutations:**
- `markAsPaid(id, sourceType, paidDate, paidAmount)` -- atualiza `client_payments`, `expenses` ou `salaries` com data e valor especificos, depois `invalidateQueries`
- Reutiliza `wasClientActiveInMonth` existente

**Retorno:**
- Todos os valores calculados, arrays, loading states, mutations, refetch

### 2. `src/components/admin/CommandCenter/HeroMetrics.tsx`
Grid `md:grid-cols-2 lg:grid-cols-4` com 4 cards:
- **MRR** (icone TrendingUp, cor verde)
- **Burn Rate** (icone TrendingDown, cor vermelho) -- despesas + folha
- **Lucratividade** (icone Calculator) -- valor + Badge com margem % (verde se >= 0, vermelho se < 0)
- **Inadimplencia** (icone AlertTriangle) -- total overdue

Recebe props do hook. Mostra `<Skeleton>` se loading.

### 3. `src/components/admin/CommandCenter/CashFlowTable.tsx`
Card com span-2 no grid principal.

- Filtros rapidos no topo: "Proximos 7 dias", "Este Mes", "Atrasados" (botoes toggle)
- Tabela de `unifiedCashFlow` com colunas: Tipo (icone income/expense), Titulo, Valor, Vencimento, Status (Badge verde/amarelo/vermelho)
- Botao "Dar Baixa" em cada linha pendente/atrasada que abre um **Popover** (nao Dialog):
  - Campo "Data do Pagamento" (default: hoje)
  - Campo "Valor Pago" (default: valor original, input number com step 0.01)
  - Botao "Confirmar" que chama `markAsPaid`
- Componente "Top Categorias de Custo" abaixo da tabela:
  - Lista as top 5 categorias ordenadas por valor
  - Barra de progresso proporcional ao total

### 4. `src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`
Card com span-1.
- Titulo "Rentabilidade por Cliente"
- Lista clientes ativos: nome, fee, custo estimado, margem %
- Warning amarelo (AlertTriangle) se margem < 30%
- Barra visual de margem

### 5. `src/components/admin/CommandCenter/TeamSection.tsx`
Secao inferior.
- Cards minimalistas por funcionario (nome, cargo, salario, badge ativo/inativo)
- Botao "Gerenciar Equipe" que abre `<Sheet>` com lista completa + acoes (editar, excluir, ativar/desativar)
- Botoes "Gerar Salarios do Mes" e "Fechamento Mensal" dentro do Sheet

### 6. `src/components/admin/CommandCenter/FloatingActionBar.tsx`
Div `sticky top-0 z-10 bg-background/95 backdrop-blur` com:
- Titulo "Centro de Comando"
- Seletor de mes (reutiliza o Select existente)
- Botoes: "Novo Cliente", "Lançar Despesa", "Adicionar Receita"
- Cada botao dispara callbacks que abrem os respectivos Sheets

### 7. `src/components/admin/CommandCenter/AdminSheets.tsx`
Componente que renderiza todos os Sheets laterais. **Diretriz 1**: nenhum form renderiza `<Dialog>` internamente.

**Estrategia de migracao Dialog→Sheet:**
Os 6 componentes de formulario (ClientForm, PaymentForm, ExpenseForm, SalaryForm, EmployeeForm, EmployeeDetailsDialog) e 3 de detalhes (ClientDetailsDialog, ExpenseDetailsDialog, SalaryDetailsDialog) usam `<Dialog>` internamente. Em vez de refatorar cada componente (alto risco de regressao), vou criar **wrapper components** que:
1. Controlam `open/onOpenChange` via `<Sheet>`
2. Renderizam o conteudo interno do form sem o Dialog wrapper
3. Para cada form, extrairei o conteudo JSX (form fields + footer) em um componente `*FormContent` e o wrappearei com `<SheetContent>`

Concretamente, para cada form:
- `ClientForm` → crio `ClientFormContent` (exporta apenas o form, sem Dialog) + uso `<Sheet><SheetContent>` no AdminSheets
- Idem para PaymentForm, ExpenseForm, SalaryForm, EmployeeForm
- Para detalhes: ClientDetailsDialog, ExpenseDetailsDialog, SalaryDetailsDialog, EmployeeDetailsDialog → crio versoes `*DetailsContent` sem Dialog

### 8. `src/components/admin/CommandCenter/MarkAsPaidPopover.tsx`
Componente reutilizavel com `<Popover>`:
- Props: `originalAmount`, `onConfirm(paidDate, paidAmount)`
- Campos: data (input date, default hoje), valor (input number step 0.01, default originalAmount)
- Botao confirmar

---

## Arquivo a Modificar

### `src/pages/Admin.tsx`
Reduzir de 3331 para ~150-200 linhas:
- Manter: verificacao de acesso (`hasAccess`), `selectedMonth` state, estados de abertura dos Sheets
- Remover: todos os `useState` de dados (clients, payments, etc.), todos os `fetchX()`, todos os `useMemo` de analytics, todo o JSX de Tabs
- Importar `useFinancialMetrics(currentAgency?.id, selectedMonth)`
- Estrutura:

```
<FloatingActionBar selectedMonth onChangeMonth onNewClient onNewExpense onNewPayment />
<HeroMetrics metrics={...} loading={...} />
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <CashFlowTable className="lg:col-span-2" cashFlow={...} markAsPaid={...} expensesByCategory={...} />
  <ClientProfitabilityCard clients={...} />
</div>
<TeamSection employees={...} />
<AdminSheets ... /> (todos forms/detalhes como Sheets)
<AlertDialogs /> (confirmacoes de exclusao - estes permanecem como AlertDialog)
```

### Forms existentes (ClientForm, PaymentForm, ExpenseForm, SalaryForm, EmployeeForm)
Para cada um:
- Extrair o conteudo do form (tudo dentro de `<DialogContent>`) para um componente `*FormContent`
- Manter o componente original intacto para compatibilidade com outras paginas que possam usa-lo
- O novo componente exporta `*FormContent` que pode ser usado dentro de `<SheetContent>`

### Details Dialogs (ClientDetailsDialog, ExpenseDetailsDialog, SalaryDetailsDialog, EmployeeDetailsDialog)
Mesma estrategia: extrair `*DetailsContent` sem o wrapper Dialog.

---

## Fluxo de Dados

```text
selectedMonth (state em Admin.tsx)
       |
       v
useFinancialMetrics(agencyId, selectedMonth)
       |
       +---> useQuery(clients)
       +---> useQuery(payments, filtrado por mes)
       +---> useQuery(expenses, filtrado por mes)
       +---> useQuery(salaries, filtrado por mes)
       +---> useQuery(employees)
       +---> useQuery(expenseCategories)
       |
       v
  useMemo → totalMRR, burnRate, profitability, delinquency,
            unifiedCashFlow, clientProfitability, expensesByCategory
       |
       v
  Components (HeroMetrics, CashFlowTable, etc.)
```

Mudar o `selectedMonth` invalida todas as queries dependentes automaticamente (queryKey inclui selectedMonth).

---

## Ordem de Implementacao

1. Criar `useFinancialMetrics` (toda a logica de dados)
2. Criar `MarkAsPaidPopover`
3. Criar `HeroMetrics`
4. Criar `CashFlowTable` (com top categorias e popover de baixa)
5. Criar `ClientProfitabilityCard`
6. Criar `TeamSection`
7. Criar `FloatingActionBar`
8. Extrair `*FormContent` e `*DetailsContent` dos forms/details existentes
9. Criar `AdminSheets`
10. Reescrever `Admin.tsx` usando todos os novos componentes

