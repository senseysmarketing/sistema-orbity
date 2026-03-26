

# Analise Avancada Financeira — Sheet Lateral + Hook Dedicado

## Resumo
Adicionar botao "Analise Avancada" no header do CashFlowTable que abre um Sheet lateral com 3 blocos: Raio-X do mes, Visao Anual YTD e Distribuicao de Despesas. Um hook dedicado `useAdvancedAnalytics` carrega dados anuais apenas quando o Sheet esta aberto.

## Arquivos

### 1. Criar `src/hooks/useAdvancedAnalytics.tsx`
Hook dedicado com query habilitada apenas quando `isOpen === true`:
- Busca `client_payments` com `status = 'paid'` do ano vigente (Jan-Dez)
- Calcula: faturamento anual acumulado, media mensal (acumulado / mes atual), MRR mes anterior para crescimento MoM
- Recebe `agencyId`, `selectedMonth` e `isOpen` como parametros

### 2. Criar `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`
Sheet lateral (`side="right"`, `sm:max-w-[500px]`) com 3 blocos:

**Bloco 1 — Raio-X do Mes:**
- Progress bar: valor recebido (PAID/INCOME) vs valor total esperado (todos INCOME do mes)
- Texto: "R$ X recebidos de R$ Y" + percentual

**Bloco 2 — Visao Anual (YTD):**
- Grid 3 cards: Faturamento Anual, Media Mensal, Crescimento MoM
- Badge verde (+X%) ou vermelha (-X%) no crescimento

**Bloco 3 — Top Categorias de Despesa:**
- Recebe `expensesByCategory` como prop (ja calculado no useFinancialMetrics)
- Lista top 3 com barra de progresso proporcional e valor

### 3. Editar `src/components/admin/CommandCenter/CashFlowTable.tsx`
- Adicionar botao `<Button variant="outline" size="sm">` com icone `<BarChart3>` e texto "Analise Avancada" no header, ao lado dos filtros
- Adicionar state `advancedOpen` e renderizar `<AdvancedFinancialSheet>`
- Passar props: `cashFlow`, `expensesByCategory`, `agencyId`, `selectedMonth`

### 4. Editar `src/components/admin/CommandCenter/CashFlowTable.tsx` (props)
- Adicionar `agencyId` e `selectedMonth` as props do componente

### 5. Editar `src/pages/Admin.tsx`
- Passar `agencyId` e `selectedMonth` para `<CashFlowTable>`

## Fluxo de Dados
- `cashFlow` (ja disponivel como prop) fornece dados do mes para o Bloco 1
- `expensesByCategory` (ja disponivel como prop) fornece dados para o Bloco 3
- `useAdvancedAnalytics` (novo hook, lazy) fornece dados YTD para o Bloco 2

