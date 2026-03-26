

# Melhorias no AdvancedFinancialSheet — 4 Itens

## Mudancas

### 1. `src/hooks/useAdvancedAnalytics.tsx`

**Fix MoM NaN:** Linha 53, trocar a logica:
- Se `prevMRR === 0 && currentMRR > 0` → retornar `100`
- Se `prevMRR === 0 && currentMRR === 0` → retornar `0`
- Caso contrario, calculo normal

**Aceitar `selectedYear` como parametro opcional:** O hook recebera um `selectedYear` (string) que sobrescreve o ano extraido do `selectedMonth`. Isso permite consultar anos anteriores.

**Buscar tambem dados do mes anterior quando janeiro:** Quando o mes selecionado e janeiro, o prevMonth pertence ao ano anterior. A query atual so busca o ano corrente, entao o prevMRR sera sempre 0 em janeiro. Adicionar uma segunda query condicional para o ano anterior quando `currentMonthNum === 1`.

**Adicionar `annualRunRate`:** `currentMRR * 12` — calculado no useMemo e retornado.

### 2. `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`

**Bloco 1 — Inadimplencia:** Abaixo da barra de progresso, calcular `totalOverdue` a partir do `cashFlow` (filtrar `type === 'INCOME' && status === 'OVERDUE'`). Exibir com `text-destructive` e icone `AlertTriangle` quando > 0.

**Bloco 2 — Run Rate:** Mudar grid de `grid-cols-3` para `grid-cols-2 sm:grid-cols-4`. Adicionar quarto card "Projecao Anual" com `analytics.annualRunRate`.

**Seletor de Ano:** Adicionar `useState` para `selectedYear` (default: ano do `selectedMonth`). Renderizar um `<Select>` discreto ao lado do titulo no SheetHeader com opcoes de ano (ano atual - 2 ate ano atual). Passar `selectedYear` ao hook.

**Loading state:** Exibir `Skeleton` nos valores quando `analytics.isLoading`.

### Arquivos
- `src/hooks/useAdvancedAnalytics.tsx` (editar)
- `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx` (editar)

