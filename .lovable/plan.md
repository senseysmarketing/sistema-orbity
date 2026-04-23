

# Gerador de DRE com Guardrails Financeiros

## Visão geral

Nova aba **"DRE / Contabilidade"** no `AdvancedFinancialSheet`, com classificação robusta de impostos (sem regex em títulos), projeção inteligente via taxa efetiva histórica, e CSS de impressão baseado em `display: none` (preserva fluxo do documento).

## 1. Categorização Robusta — `category` no `CashFlowItem`

Em `src/hooks/useFinancialMetrics.tsx`:

- Adicionar `category?: string` ao `CashFlowItem`.
- No `unifiedCashFlow` (linha 520), preencher `category: e.category` ao mapear `expenses` para o item de fluxo. Despesas/salários sem categoria ficam `undefined`.

Isso permite identificar impostos pela **categoria nominal**, não pelo título.

### Heurística de imposto (centralizada em `useDREStatement`)

```ts
const TAX_KEYWORDS = ['imposto', 'tributo', 'taxa', 'das', 'simples', 'iss', 'irpj', 'csll', 'pis', 'cofins'];
const isTaxCategory = (category?: string) => {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return TAX_KEYWORDS.some(k => c.includes(k));
};
```

Match em **nome da categoria**, case-insensitive. Não inspeciona o `title`.

## 2. Hook `useDREStatement` — `src/hooks/useDREStatement.ts` (novo)

Recebe: `{ cashFlow, isForecastMode, totalForecastMRR, totalActivePayroll, totalForecastFixed, historicalCashFlow }` (último opcional, vindo do mês anterior real para cálculo de taxa efetiva).

### Cálculos (modo real)

```ts
const incomes  = cashFlow.filter(i => i.type === 'INCOME' && i.status === 'PAID');
const expensesItems = cashFlow.filter(i => i.type === 'EXPENSE' && i.status !== 'CANCELLED' && i.sourceType === 'expense');
const salariesItems = cashFlow.filter(i => i.type === 'EXPENSE' && i.status !== 'CANCELLED' && i.sourceType === 'salary');

const receitaBruta   = sum(incomes);
const impostos       = sum(expensesItems.filter(e => isTaxCategory(e.category)));
const custosOper     = sum(expensesItems.filter(e => !isTaxCategory(e.category)));
const folhaPag       = sum(salariesItems);
```

### Projeção inteligente (modo forecast)

Em vez de zerar impostos, calcular **taxa efetiva histórica** a partir do `historicalCashFlow` (mês real mais recente disponível, vindo do `Admin.tsx` via `useFinancialMetrics` do mês anterior — ou mesmo do mês atual se já tiver receita realizada):

```ts
const FALLBACK_TAX_RATE = 0.06; // 6%
const histIncomes = historical.filter(i => i.type==='INCOME' && i.status==='PAID');
const histTaxes   = historical.filter(i => i.type==='EXPENSE' && i.sourceType==='expense' && isTaxCategory(i.category));
const histRevenue = sum(histIncomes);
const effectiveTaxRate = histRevenue > 0 ? sum(histTaxes) / histRevenue : FALLBACK_TAX_RATE;

const receitaBruta = totalForecastMRR;
const impostos     = receitaBruta * effectiveTaxRate;
const custosOper   = totalForecastFixed;
const folhaPag     = totalActivePayroll;
```

### Cascata final

```ts
const receitaLiquida = receitaBruta - impostos;
const ebitda         = receitaLiquida - custosOper - folhaPag;
const margemPct      = receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0;

return { receitaBruta, impostos, receitaLiquida, custosOper, folhaPag, ebitda, margemPct, effectiveTaxRate, isProjectedTax: isForecastMode };
```

A UI exibe um badge "Estimado (taxa histórica X%)" ao lado da linha de impostos quando `isProjectedTax`.

## 3. Aba DRE no `AdvancedFinancialSheet.tsx`

- `TabsList` muda para `grid-cols-3`. Nova `<TabsTrigger value="dre">` com ícone `FileText`.
- `<TabsContent value="dre">` envolve um `<div id="dre-print-area">` contendo:
  - Cabeçalho `print:block` com título "DRE — {monthLabel}" + badge "Modo Projeção" se `isForecastMode`.
  - Tabela cascata (`<Table>` shadcn):

| Linha | Estilo |
|---|---|
| Receita Bruta | normal |
| (–) Impostos e Taxas | `pl-6 text-muted-foreground` (badge se estimado) |
| **= Receita Líquida** | `font-semibold bg-muted/30` |
| (–) Custos Operacionais | `pl-6 text-muted-foreground` |
| (–) Folha de Pagamento | `pl-6 text-muted-foreground` |
| **= Lucro Operacional (EBITDA)** | `font-semibold bg-muted/30` |
| Margem de Lucro Líquido | `%`, verde se ≥0, vermelho se <0 |

- Acima da tabela, dois botões `size="sm"` com classe `no-print`:
  - **Copiar Resumo** (ícone `Copy`) — gera string formatada e `navigator.clipboard.writeText` + toast.
  - **Imprimir PDF** (ícone `Printer`) — chama `window.print()`.

### Origem de `historicalCashFlow`

Em `Admin.tsx`, instanciar uma segunda chamada leve usando a estrutura existente (mês imediatamente anterior ao `selectedMonth`) e passar como prop opcional `historicalCashFlow` para `AdvancedFinancialSheet`, repassada ao `useDREStatement`. Se vazio, hook usa fallback 6%.

## 4. CSS de Impressão Correto — `src/index.css`

Substituir abordagem `visibility:hidden` por `display:none` em elementos cromados, deixando o `#dre-print-area` no fluxo natural:

```css
@media print {
  /* Esconde cromo da aplicação sem reservar espaço */
  .app-sidebar,
  [data-sidebar],
  header,
  nav,
  .no-print,
  [role="tablist"],
  button {
    display: none !important;
  }

  /* Sheet/Dialog overlays viram contêiner branco simples */
  [role="dialog"],
  [data-radix-popper-content-wrapper] {
    position: static !important;
    box-shadow: none !important;
    max-width: 100% !important;
    width: 100% !important;
    overflow: visible !important;
  }

  /* Esconde tudo que NÃO é o print area, usando :not + has para preservar ancestrais */
  body :not(:has(#dre-print-area)):not(#dre-print-area):not(#dre-print-area *) {
    /* Mantém ancestrais visíveis para que o print-area renderize */
  }

  /* Force the print area to flow */
  #dre-print-area {
    display: block !important;
    position: static !important;
    padding: 24px;
    color: #000;
    background: #fff;
  }

  #dre-print-area * { visibility: visible; }

  @page { margin: 16mm; }
}
```

Botões e header da Sheet ganham classe `no-print`. Estratégia: esconder cromo conhecido por seletor + `.no-print`, deixar o resto fluir.

## Arquivos editados

- `src/hooks/useFinancialMetrics.tsx` — adicionar `category` ao `CashFlowItem` e preencher no mapeamento de expenses.
- `src/hooks/useDREStatement.ts` (novo) — motor de cálculo com guardrails 1 e 2.
- `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx` — nova aba, tabela cascata, botões Copiar/Imprimir, prop `historicalCashFlow`.
- `src/pages/Admin.tsx` — buscar `historicalCashFlow` do mês anterior e passar como prop.
- `src/index.css` — bloco `@media print` com `display:none` para cromo + `.no-print`.

## Sem mudanças

- Schema do banco — `expense_categories` e `expenses.category` já existem.
- Demais abas, hooks de métricas, demais telas — intactos.
- Nenhuma biblioteca nova.

