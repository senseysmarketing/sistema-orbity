

# Refatoração Metas/NPS — com Guardrails de Data, Zero-State e Clareza de Métrica

## Confirmações arquiteturais
- **Reuso** de `bonus_periods` (não criar `ppr_cycles`) — preserva scorecards, NPS responses e NPSResponseForm.
- Apenas **1 nova coluna**: `min_nps_target numeric(3,1) DEFAULT 8.0` (escala 0–10).
- **Faturamento real**: somente `client_payments.status='paid'` no intervalo do ciclo (sem campo manual).

## Migration
```sql
ALTER TABLE public.bonus_periods 
  ADD COLUMN IF NOT EXISTS min_nps_target numeric(3,1) DEFAULT 8.0;
```

## Guardrails aplicados

### G1 — End of Day Trap (filtros de data)
Toda comparação de timestamp (pagamentos e NPS) usa **intervalo blindado**:
```ts
import { startOfDay, endOfDay, parseISO } from "date-fns";

// Helper centralizado
const cycleRange = (cycle: { start_date: string; end_date: string }) => ({
  from: startOfDay(parseISO(cycle.start_date)).toISOString(),
  to: endOfDay(parseISO(cycle.end_date)).toISOString(),
});

// Query
.gte("paid_at", from).lte("paid_at", to)
```
Aplicado em: `PPRDashboard.tsx` (client_payments + nps_responses) e `NPSPage.tsx` (filtro do ciclo).
**Nunca** comparar diretamente `end_date` crua (`'2026-03-31'`) contra `timestamptz`.

### G2 — Zero-State (sem crash, sem NaN)
**Faturamento (Gauge):**
```ts
const revenueProgress = revenue_target > 0
  ? Math.min(100, (totalRevenue / revenue_target) * 100)
  : 0;
```
Se meta=0 → gauge mostra `0%` com label "Meta não definida" (cinza neutro).

**NPS (Card):**
```ts
const npsAverage = responses.length > 0
  ? responses.reduce((s, r) => s + r.score, 0) / responses.length
  : null;
```
- `null` → exibe **"Sem respostas no ciclo"** com badge `bg-muted text-muted-foreground` (cinza, não vermelho).
- `>= min_nps_target` → verde semântico.
- `< min_nps_target` → vermelho/alerta.

### G3 — Clareza da métrica NPS
A coluna `min_nps_target` é **média 0–10**, não NPS clássico (% Promotores − % Detratores). A UI sempre rotula de forma inequívoca:
- Card título: **"Nota Média do Ciclo"**
- Subtexto: **"Média de {n} respostas (escala 0–10)"**
- Config: campo **"Nota Mínima Média (0–10)"**

## Mudanças por arquivo

### `src/components/goals/PPRConfigDialog.tsx`
- Renomear "Período" → "Ciclo" em todos os textos visíveis.
- Substituir campo "Meta de NPS (-100..100)" por **"Nota Mínima Média (0–10)"** com `step=0.1, min=0, max=10` → grava em `min_nps_target`.
- Manter `bonus_pool_percent` (oculto/default) para não quebrar scorecards existentes.
- `nps_target` legado preservado no INSERT (default 60) por compatibilidade.

### `src/components/goals/PPRDashboard.tsx`
**Hero "Quiet Luxury"** acima do Placar Financeiro:
- **Gauge SVG semi-circular** — `totalRevenue / revenue_target` do ciclo inteiro, com guardrail G2.
- **Card Nota Média do Ciclo** — query nova:
  ```ts
  supabase.from("nps_responses")
    .select("score")
    .eq("agency_id", agencyId)
    .gte("response_date", from).lte("response_date", to)
  ```
  Aplica G1 e G2. Exibe "X.X / 10" + "Média de N respostas" + badge semântica (verde/vermelho/cinza).
- Tipografia leve: `text-4xl font-light tracking-tight`, label `text-xs uppercase tracking-wider text-muted-foreground`, padding `p-8`, sem gradientes.
- `revenueProgress` passa a usar `totals.totalRevenue` (soma do ciclo) com G2.
- Placar mensal e scorecard intactos.

### `src/pages/NPSPage.tsx`
Barra de filtro no topo:
- Toggle **"Ver Ciclo Atual"** — busca em `bonus_periods` o ciclo da agência onde `now() BETWEEN start_date AND end_date`.
- Aplica intervalo blindado (G1) em `responses` antes dos `useMemo` de gráficos/lista.
- Badge: `"Ciclo: {label} ({dd/mm} – {dd/mm})"`.
- Sem ciclo ativo → botão desabilitado com tooltip.

## Garantias

| # | Garantia |
|---|---|
| 1 | Pagamento às 23:59:59 do último dia entra no ciclo (G1). |
| 2 | Meta zerada → 0% sem dividir por zero (G2). |
| 3 | Zero respostas NPS → "Sem respostas" cinza, sem NaN, sem punição visual (G2). |
| 4 | UI deixa claro que é **média 0–10**, não NPS clássico (G3). |
| 5 | Reuso de `bonus_periods` mantém scorecards, nps_responses e form existentes funcionando. |
| 6 | Sem novas RLS, sem secrets, sem edges. |

## Ficheiros alterados
- **Migration**: `ALTER TABLE bonus_periods ADD min_nps_target numeric(3,1) DEFAULT 8.0`
- `src/components/goals/PPRConfigDialog.tsx`
- `src/components/goals/PPRDashboard.tsx`
- `src/pages/NPSPage.tsx`

