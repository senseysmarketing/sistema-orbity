

# Reorganizar Layout do AdvancedFinancialSheet

## Problema
Os 4 cards do Bloco 2 (Visao Anual YTD) estao apertados no grid `grid-cols-2 sm:grid-cols-4`, causando numeros vazados e texto cortado dentro do Sheet de 500px.

## Solucao

### `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`

**Bloco 2 — Trocar grid de 4 cards por grid de 2 colunas:**
- Mudar de `grid-cols-2 sm:grid-cols-4` para `grid-cols-2` fixo (2 colunas sempre)
- Aumentar padding interno dos cards: `pt-4 pb-3 px-3` → `p-4`
- Usar `text-sm` para valores em vez de `text-sm font-bold` apertado — manter bold mas garantir `truncate` ou `whitespace-nowrap` nos valores monetarios
- Adicionar `min-w-0` nos cards para evitar overflow

**Bloco 1 — Pequenos ajustes de respiro:**
- Adicionar `px-5` ao CardContent para mais respiro lateral

**Bloco 3 — Manter como esta** (ja funciona bem)

**Resultado:** 2x2 grid com cards mais espaçosos, numeros legíveis e sem overflow.

### Arquivo
- `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`

