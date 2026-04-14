

# Mostrar Data/Hora de Pagamento ao Lado do Badge "Pago"

## Problema Identificado

1. **Dados ausentes**: O pagamento de teste (R$5, Cantinho da Prata via Conexa) tem `paid_at = NULL` no banco. Apenas `paid_date = '2026-04-14'` está preenchido. O tooltip atual depende de `paid_at`, então não mostra nada.
2. **UI**: O tooltip exige hover e não é visível de imediato. O usuário quer um texto visível ao lado do badge.

## Correções

### 1. `CashFlowTable.tsx` — Texto visível ao lado do badge
- Remover a lógica de Tooltip para o status PAID
- Mostrar o badge "Pago" seguido de um `<span>` com texto pequeno (`text-xs text-muted-foreground`) exibindo a data/hora
- Se `paidAt` contém horário (ISO timestamp), mostrar "14/04/2026 às 13:39"
- Se só tem `paid_date` (fallback, sem horário), mostrar apenas "14/04/2026"
- Layout: `<div className="flex items-center gap-2">{badge}<span>...</span></div>`

### 2. `useFinancialMetrics.tsx` — Fallback mais robusto no mapeamento
- A linha `paidAt: (p as any).paid_at || p.paid_date || undefined` já faz fallback para `paid_date`, mas `paid_date` é apenas uma data (sem hora). O código na UI precisa detectar se é timestamp completo ou só data para formatar adequadamente.

### 3. Verificar se expenses e salaries também mapeiam `paidAt`
- Garantir que os mapeamentos de expenses e salaries no `unifiedCashFlow` também passem `paid_at` / `paid_date` para o `CashFlowItem`.

## Arquivo alterado
- `src/components/admin/CommandCenter/CashFlowTable.tsx`
- `src/hooks/useFinancialMetrics.tsx` (se expenses/salaries não mapeiam paidAt)

