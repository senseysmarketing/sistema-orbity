
# Performance & PPR — Refatoração completa (v2 — ajustada)

Unificar `/dashboard/goals` e `/dashboard/nps` em **Performance & PPR** com cálculo de bônus baseado em **lucro líquido real**, executado por Edge Function e auditável por snapshots no banco. Implementação em 7 fases, incorporando todos os ajustes confirmados.

---

## Respostas confirmadas

1. **`ppr_financial_adjustments`** → cria `effective_date date NOT NULL`. Alocação por mês usa `effective_date BETWEEN month_start AND month_end`.
2. **`salaries`** → já tem `status`, `paid_at`, `paid_date`. Usa `COALESCE(paid_at::date, paid_date)`.
3. **Pesos** → cria `employees.eligibility_weight numeric NOT NULL DEFAULT 1` agora. UI v1 não edita; cálculo lê.
4. **Rota NPS** → `/dashboard/nps` faz redirect imediato para `/dashboard/goals?tab=nps`. Mantém `NPSPage.tsx` por algumas semanas como fallback.

---

## Fase 1 — Migration única

### Ajustes em `bonus_periods`

```text
-- Separação status do período × status do cálculo
status text NOT NULL DEFAULT 'open'                     -- 'open' | 'closed'
calculation_status text NOT NULL DEFAULT 'not_calculated' -- 'not_calculated' | 'calculated' | 'stale' | 'error'
calculation_error text

profit_target numeric NOT NULL DEFAULT 50000
profit_actual numeric NOT NULL DEFAULT 0
ppr_percent numeric NOT NULL DEFAULT 10
bonus_pool_mode text NOT NULL DEFAULT 'percent_of_profit'  -- 'percent_of_profit' | 'manual'
bonus_pool_manual_amount numeric
target_is_blocking boolean NOT NULL DEFAULT false
calculated_at timestamptz
closed_at timestamptz
closed_by uuid
calculation_snapshot jsonb
```

Campos legados (`revenue_target`, `revenue_actual`, `net_profit`, `bonus_pool_amount`, antigo `status` se já existir com outros valores) — preservados para compatibilidade. Se `bonus_periods.status` já existir com outros enums, normalizar via UPDATE para `'open'`/`'closed'` no próprio migration.

### Novas tabelas

- **`ppr_period_months`** — unique (`period_id, month_start`); colunas: revenue/expenses/salaries/adjustments/net_profit/bonus_pool, `source_snapshot jsonb`, `calculated_at`.
- **`ppr_financial_adjustments`** — `effective_date date NOT NULL`, `adjustment_type` (`revenue_adjustment` | `expense_adjustment` | `salary_adjustment` | `other`), `amount`, `description`, `created_by`.
- **`ppr_employee_results`** — unique (`period_id, employee_id`); `eligibility_weight`, `base_share`, `score_final`, `bonus_amount`, `calculation_details jsonb`.
- **`ppr_calculation_logs`** — `action`, `details jsonb`, `actor_user_id`.

### Ajustes em `employee_scorecards`

```text
status text NOT NULL DEFAULT 'draft'  -- 'draft' | 'submitted' | 'locked'
reviewer_user_id uuid
submitted_at timestamptz
locked_at timestamptz
notes text
criteria_snapshot jsonb
```

### Ajustes em `employees`

```text
eligibility_weight numeric NOT NULL DEFAULT 1
```

### Ajustes em `nps_tokens`

```text
period_id uuid REFERENCES bonus_periods(id) ON DELETE SET NULL

CREATE UNIQUE INDEX nps_tokens_unique_client_period
  ON nps_tokens(client_id, period_id) WHERE period_id IS NOT NULL;
```

### RLS

- Leitura: `user_belongs_to_agency(agency_id)`.
- Escrita em `ppr_financial_adjustments` e `employee_scorecards`: `is_agency_admin(agency_id)` **AND** `period.status != 'closed'` (via subquery/função auxiliar).
- `ppr_period_months`, `ppr_employee_results`, `ppr_calculation_logs`, `bonus_periods.calculation_snapshot` → **escrita só via service role** (Edge Function).
- `bonus_periods` aceita update por admin apenas se `status != 'closed'` (exceto reabrir, que é endpoint dedicado).

### Triggers de `calculation_status = 'stale'`

Para cada tabela abaixo, criar trigger AFTER INSERT/UPDATE/DELETE que faz `UPDATE bonus_periods SET calculation_status='stale' WHERE agency_id=NEW.agency_id AND status != 'closed' AND calculation_status = 'calculated' AND <data efetiva BETWEEN start_date AND end_date>`:

- `client_payments` (status='paid'): data = `COALESCE(paid_at::date, paid_date)`.
- `expenses` (status='paid'): idem.
- `salaries` (status='paid'): idem.
- `ppr_financial_adjustments`: data = `effective_date`.
- `employee_scorecards`: marca apenas o `period_id` específico.

**Períodos `closed` nunca são marcados stale automaticamente.**

---

## Fase 2 — Edge Function `calculate-ppr-period`

Entrada: `{ period_id }`. Reusa `_shared/auth.ts` com roles `owner`/`admin`. Idempotente (todos os escritas via upsert).

### Fluxo

1. Carrega `bonus_periods`; bloqueia se `status='closed'` (a menos que action seja `close`, ver Fase 5).
2. Para cada mês entre `start_date` e `end_date`:
   - **Receita** por mês:
     ```sql
     SUM(CASE WHEN amount_paid IS NOT NULL AND amount_paid > 0 THEN amount_paid ELSE amount END)
     FROM client_payments
     WHERE agency_id=$1 AND status='paid'
       AND COALESCE(paid_at::date, paid_date) BETWEEN month_start AND month_end
     ```
   - **Despesas**: `SUM(amount)` de `expenses` `status='paid'` com mesma regra de data.
   - **Salários**: `SUM(amount)` de `salaries` `status='paid'`, `COALESCE(paid_at::date, paid_date)`.
   - **Ajustes**: `SUM(amount)` de `ppr_financial_adjustments` com `effective_date BETWEEN month_start AND month_end` (sinal por `adjustment_type`).
   - `net_profit = revenue - expenses - salaries + adjustments`.
   - `source_snapshot` com totais, contagens e itens:
     ```json
     {
       "client_payments": { "count": 12, "total": 32000, "items": [{ "id":"...", "amount": 3000, "paid_date":"2026-03-10" }] },
       "expenses": { "count": 8, "total": 9000, "items": [...] },
       "salaries": { "count": 5, "total": 11000, "items": [...] },
       "adjustments": { "count": 1, "total": 500, "items": [...] }
     }
     ```
   - Upsert em `ppr_period_months`.
3. `profit_actual` = soma dos `net_profit` mensais.
4. **Pote**:
   - `percent_of_profit`: `max(0, profit_actual * ppr_percent/100)`.
   - `manual`: `bonus_pool_manual_amount`.
5. Para cada `employees` com `is_active=true AND eligible_for_ppr=true`:
   - `total_weight = SUM(eligibility_weight)` dos elegíveis.
   - `base_share = pool * eligibility_weight / total_weight`.
   - `score_final = employee_scorecards.weighted_average` do período (0 se ausente).
   - `bonus_amount = max(0, base_share * score_final / 10)`.
   - Upsert em `ppr_employee_results`.
6. `UPDATE bonus_periods SET profit_actual, bonus_pool_amount, calculated_at=now(), calculation_status='calculated', calculation_error=NULL, calculation_snapshot=...`.
7. Insert em `ppr_calculation_logs` (`period_recalculated`).
8. Retorna payload consolidado.

### Tratamento de erro

`try/catch` global → `UPDATE bonus_periods SET calculation_status='error', calculation_error=<msg>` + log `calculation_failed`. UI exibe alerta com `calculation_error`.

### Validações

- `start_date < end_date`.
- Sem overlap entre períodos `status='open'` da mesma agência (validar na criação/edição via função SQL + checagem na Edge Function que cria período).
- Nunca `bonus_amount < 0` ou NaN.

---

## Fase 3 — Refatoração frontend

Criar `src/components/performance/`:
- `PerformancePPRPage.tsx` (container + tabs)
- `PPRPeriodSelector.tsx`, `PPRPeriodDialog.tsx`, `PPRRecalculateButton.tsx`, `PPRClosePeriodButton.tsx`
- `PPRSummaryCards.tsx`
- `PPRFinancialTab.tsx` (lê `ppr_period_months`, alertas de dados faltantes, drill-down via `source_snapshot`)
- `PPRBonusTab.tsx` (lê `ppr_employee_results`)
- `PPRScorecardsTab.tsx` (reaproveita `ScorecardCard` ajustado; bloqueia se período `closed`)
- `PPRNpsTab.tsx` (migra `NPSPage.tsx`)
- `PPRAuditTab.tsx` (lê `ppr_calculation_logs`)

`src/pages/Goals.tsx` renderiza `PerformancePPRPage`. `src/pages/NPSPage.tsx` → componente redirect para `/dashboard/goals?tab=nps` (mantém arquivo).

**`PPRConfigDialog` → `PPRPeriodDialog`**: nome, datas, `profit_target`, `ppr_percent`, `bonus_pool_mode`, `target_is_blocking`. Validação de overlap antes de salvar.

**`ScorecardCard`** ajustado: sem auto-conversão NPS→nota individual (só sugestão), comentário opcional por critério em `criteria_snapshot`, status visual (draft/submitted/locked), edição bloqueada se `period.status='closed'`.

**Frontend nunca recalcula.** Botão "Recalcular" invoca Edge Function.

### Textos obrigatórios na UI

- Aba Visão Geral: *"A meta é uma referência de performance da empresa. O bônus é calculado sobre o lucro líquido do período e não é bloqueado caso a meta não seja atingida."*
- `ProgramSelector` (PPR): substituir *"Só paga se houver lucro"* por *"O bônus é calculado sobre o lucro líquido do período. A meta é uma referência de performance e não bloqueia o pagamento."*

---

## Fase 4 — NPS

- Migrar UI de `NPSPage.tsx` + `NPSResponseForm.tsx` para `PPRNpsTab`.
- Token: vincular `period_id = selectedPeriod.id`. Antes de gerar token novo, verificar `nps_tokens_unique_client_period`: reaproveitar token ativo não usado ou expirar anterior.
- `PublicNPSSurvey.tsx`: trocar `passive` → `neutral`; herdar `period_id` do token na resposta.
- NPS é apenas indicador; sem multiplicador automático no bônus.

---

## Fase 5 — Fechamento / Reabertura

Edge Function action `close_period`:
1. Recalcula.
2. Congela `calculation_snapshot`.
3. `bonus_periods.status='closed'`, `closed_at`, `closed_by`.
4. `UPDATE employee_scorecards SET status='locked', locked_at=now() WHERE period_id=$1`.
5. Log `period_closed`.

Action `reopen_period` (owner/admin): reverte `status='open'`, exige campo `reason`, log `period_reopened` obrigatório.

---

## Fase 6 — Ordem de implementação

1. **Fase 1** (migration) — pede aprovação isolada.
2. Após migration + types regenerados → Fase 2 (Edge Function).
3. Fase 3 (frontend novo) em paralelo com Fase 4 (NPS).
4. Fase 5 (fechamento) por último.

---

## Critérios de sucesso

1. Criar período Março–Maio com `profit_target=50000`, `ppr_percent=10`.
2. Recalcular → soma lucro de mar+abr+mai a partir de `client_payments`/`expenses`/`salaries` pagos + ajustes.
3. Meta de R$ 50.000 é referência, não bloqueio.
4. Bônus pago mesmo abaixo da meta (exceto prejuízo, pool=0).
5. Pote = lucro × ppr_percent (ou manual).
6. Cada colaborador elegível tem bônus por scorecard.
7. UI mostra origem de cada número via `source_snapshot`.
8. Cálculo 100% backend, idempotente.
9. NPS aparece como indicador apenas.
10. Período fechado tem snapshot congelado e edição bloqueada.

---

## Fora do escopo

Multiplicadores avançados, gamificação, edição de pesos na UI v1, exportações.

---

Aprovar este plano para eu iniciar pela **Fase 1 (migration)**.
