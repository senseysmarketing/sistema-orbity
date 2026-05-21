
# Fase 3 — Refatoração frontend Performance & PPR

Migrar a página `Goals` e `NPSPage` para um único módulo **Performance & PPR** consumindo o backend criado nas fases 1 e 2. Frontend nunca recalcula; lê dos snapshots e dispara a Edge Function.

---

## 1. Estrutura de arquivos

Criar `src/components/performance/`:

```text
performance/
├── PerformancePPRPage.tsx          # container + tabs + URL ?tab=
├── PPRPeriodSelector.tsx           # dropdown períodos + badges status
├── PPRPeriodDialog.tsx             # criar/editar (substitui PPRConfigDialog)
├── PPRRecalculateButton.tsx        # invoca calculate-ppr-period
├── PPRClosePeriodButton.tsx        # action=close c/ confirmação
├── PPRSummaryCards.tsx             # lucro, pote, meta (referência), status
├── tabs/
│   ├── PPROverviewTab.tsx          # cards + alerta meta-não-bloqueante
│   ├── PPRFinancialTab.tsx         # tabela ppr_period_months + drill-down
│   ├── PPRAdjustmentsTab.tsx       # CRUD ppr_financial_adjustments
│   ├── PPRBonusTab.tsx             # ppr_employee_results + scorecards
│   ├── PPRScorecardsTab.tsx        # ScorecardCard refinado
│   ├── PPRNpsTab.tsx               # migra UI do NPSPage
│   └── PPRAuditTab.tsx             # ppr_calculation_logs
└── SourceSnapshotDrawer.tsx        # mostra ids/datas/totais do mês
```

Criar `src/hooks/`:

```text
useBonusPeriods.ts        # lista períodos da agência
usePPRPeriodData.ts       # ppr_period_months + employee_results + scorecards do período
usePPRMutations.ts        # create/update/close/reopen períodos + recalculate (invoke edge)
usePPRAdjustments.ts      # CRUD ajustes
usePPRAuditLogs.ts        # logs do período
```

Todos usam React Query (cache global 5min já configurado).

---

## 2. Rota e navegação

- `src/pages/Goals.tsx` (173 linhas) → enxuto, apenas renderiza `<PerformancePPRPage />`. Mantém lógica antiga de `bonus_programs` (auto-cria PPR ativo se não houver, sem mostrar `ProgramSelector` por enquanto — PPR é o único modo suportado).
- `src/pages/NPSPage.tsx` → vira **componente redirect** simples: `<Navigate to="/dashboard/goals?tab=nps" replace />`. Arquivo preservado (não deletar — fallback).
- `src/components/layout/AppSidebar.tsx`: item "NPS" passa a apontar `/dashboard/goals?tab=nps` (mesmo `permission: canAccessNPS`). Item "Metas & Bônus" renomeado para **"Performance & PPR"**.
- `PerformancePPRPage` lê `?tab=` do `useSearchParams` e sincroniza com o `Tabs` do shadcn. Default: `overview`.

---

## 3. PerformancePPRPage — layout

Header sticky:
```
[Trophy] Performance & PPR · {período selecionado}        [PeriodSelector] [Recalcular] [Fechar Ciclo]
```

Tabs: **Visão Geral · Financeiro · Ajustes · Bônus · Scorecards · NPS · Auditoria**

Alerta global (banner cinza, dismissable session-only):
> "A meta é referência de performance da empresa. O bônus é calculado sobre o lucro líquido do período e não é bloqueado caso a meta não seja atingida."

Status do cálculo (badge ao lado do header):
- `not_calculated` → "Aguardando cálculo" (cinza)
- `calculated` → "Atualizado · {calculated_at}" (verde)
- `stale` → "Desatualizado — recalcular" (amarelo + botão recalcular destacado)
- `error` → "Erro no cálculo" (vermelho) + tooltip com `calculation_error`

Se `period.status='closed'` → todas as ações de edição desabilitadas; botão **"Reabrir período"** visível só para `owner`/`admin`.

---

## 4. Tabs (detalhes principais)

### Visão Geral
- 4 cards: Lucro Líquido, Pote do Bônus (`bonus_pool_amount`), Meta de Lucro (`profit_target` — referência), % PPR
- Mini chart: lucro por mês (a partir de `ppr_period_months`)
- Lista compacta dos colaboradores e bônus calculado (top 5)

### Financeiro
Tabela mês a mês (lê `ppr_period_months`):

| Mês | Receita | Despesas | Salários | Ajustes | Lucro | Pote |
|---|---|---|---|---|---|---|

Clicar em qualquer célula → abre `SourceSnapshotDrawer` mostrando `source_snapshot` daquela categoria: contagem, total e lista de itens (id, valor, data). Permite auditoria sem sair da tela.

Se cálculo estiver `not_calculated`/`stale`, mostra placeholder "Recalcule para ver os números atualizados".

### Ajustes
- CRUD de `ppr_financial_adjustments` (admin only, bloqueado em período fechado).
- Form: `effective_date` (date picker), `adjustment_type` (4 opções), `amount`, `description`.
- Mostrar selo de cor por tipo. Aviso quando `effective_date` cair fora do intervalo do período selecionado: "Este ajuste não afetará o período X. Selecione um período compatível."

### Bônus
- Tabela `ppr_employee_results`: colaborador, peso, base, score (média scorecard /10), bônus final, total.
- Não permite editar (snapshot).
- Export CSV (front-end, fora do escopo de cálculo).

### Scorecards
- Lista de colaboradores elegíveis (`is_active=true AND eligible_for_ppr=true`) ordenada por nome.
- Renderiza `ScorecardCard` **ajustado** (ver §5).
- Cabeçalho com filtro "Apenas pendentes" e "Apenas enviados".
- Bloqueado se `period.status='closed'`.

### NPS (migrada de NPSPage)
- Mantém os blocos atuais: lista de respostas, envio de pesquisa, gráfico de NPS por categoria, customização do formulário.
- Mudanças mínimas necessárias:
  - `passive` → `neutral` em queries/agregações/labels.
  - Ao gerar token, passar `period_id = selectedPeriod.id`.
  - Antes de criar token, verificar se já existe um não-usado e não-expirado para `(client_id, period_id)`: reusa se sim; senão cria novo. Tratar erro de unique constraint com mensagem clara.
- `PublicNPSSurvey.tsx` (rota pública): trocar `passive`→`neutral` na inserção da resposta; herdar `period_id` do token.

### Auditoria
- Lista paginada de `ppr_calculation_logs` do período (action, actor, created_at, details preview JSON).

---

## 5. ScorecardCard refinado

- Mantém 3 critérios atuais (`nps_retention_score`, `technical_delivery_score`, `process_innovation_score`) com pesos 4/4/2 e média 0–10. **Sem mudança de schema** — escala já é 0–10.
- Remove auto-cálculo de `final_bonus`/`max_share` na UI; passa a apenas exibir `score_final` e `bonus_amount` do `ppr_employee_results` (read-only após cálculo).
- Botões/ações:
  - `Salvar rascunho` (status=`draft`)
  - `Enviar para revisão` (status=`submitted`, marca `submitted_at`)
  - Locked → apenas leitura, ícone cadeado.
- Campo de comentário opcional por critério persistido em `criteria_snapshot` (jsonb `{ [field]: string }`) + campo `notes` geral.
- Botão "Usar NPS" continua, mas apenas sugere valor no input (não persiste sozinho).
- Edição bloqueada se `period.status='closed'` (mostra badge "Período fechado").

---

## 6. PPRPeriodDialog (substitui PPRConfigDialog)

Form:
- `label` (texto)
- `start_date` / `end_date` (date pickers)
- `profit_target` (default 50000) — rotulado como **"Meta de lucro (referência)"**
- `ppr_percent` (default 10) — slider 0–50%
- `bonus_pool_mode` — radio: `percent_of_profit` | `manual`
  - se `manual` → mostra campo `bonus_pool_manual_amount`
- Validação local de sobreposição: chamar RPC `check_bonus_period_overlap(agency_id, start, end, exclude_id?)` no `onSubmit`. Bloquear com mensagem clara se houver conflito.
- Após salvar, perguntar via toast com ação: "Período criado. Recalcular agora?" → dispara `calculate-ppr-period`.
- Excluir: só permite se `status != 'closed'` E sem snapshot calculado relevante (warning explícito).

---

## 7. Recalcular / Fechar / Reabrir

- **Recalcular**: `supabase.functions.invoke('calculate-ppr-period', { body: { period_id, action: 'recalculate' } })`. Toast com `profit_actual` e `bonus_pool`. Invalida queries do período.
- **Fechar**: confirmação modal: "Após fechar, scorecards e ajustes ficam travados. Reabrir exige justificativa." Dispara `action: 'close'`.
- **Reabrir**: dialog exigindo campo `reason` (textarea required). Hoje a Edge Function ainda não implementa `reopen_period` (não foi feito na Fase 2). **Decisão**: criar nesta fase um endpoint mínimo `action: 'reopen'` na Edge Function existente que: valida role owner/admin, exige `reason`, faz `UPDATE bonus_periods SET status='open', closed_at=NULL, closed_by=NULL`, insere log `period_reopened` com `details.reason`. Pequena extensão pontual; sem nova migration.

---

## 8. Textos críticos

- `ProgramSelector` (caso permaneça visível): substituir a frase atual *"Só paga se houver lucro"* por:
  > "O bônus é calculado sobre o lucro líquido do período. A meta é uma referência de performance e não bloqueia o pagamento."
- Visão Geral exibe o mesmo aviso como banner sempre visível (não dismissable em períodos não calculados).

---

## 9. O que NÃO muda nesta fase

- Schema do banco (já feito na Fase 1).
- Edge Function de cálculo (Fase 2), exceto adicionar a `action: 'reopen'`.
- `PPRDashboard.tsx` antigo (948 linhas) — fica **órfão** após Goals.tsx ser refatorado. Não deletar; remover apenas a importação. Limpeza posterior.
- `NPSPage.tsx` — vira redirect mas arquivo permanece.
- Permissões (`canAccessNPS`, `canAccessGoals`) ficam como estão.

---

## 10. Ordem de implementação dentro desta fase

1. Hooks (`useBonusPeriods`, `usePPRPeriodData`, `usePPRMutations`, `usePPRAdjustments`, `usePPRAuditLogs`).
2. `PerformancePPRPage` + `PPRPeriodSelector` + `PPRPeriodDialog` (esqueleto + criar/listar/editar).
3. `PPRSummaryCards` + `PPRRecalculateButton` (fluxo recalcular ponta-a-ponta).
4. Tabs: Visão Geral → Financeiro → Bônus → Ajustes → Scorecards → NPS → Auditoria.
5. Migrar `Goals.tsx` para usar `PerformancePPRPage`.
6. Redirect em `NPSPage.tsx` + sidebar atualizada + rotulagem.
7. Extensão Edge Function: `action: 'reopen'` + `PPRClosePeriodButton` com reabertura.

---

## Critérios de sucesso da Fase 3

1. Acessar `/dashboard/goals` → `PerformancePPRPage` carrega com tabs.
2. Criar período Q1/2026 (`profit_target=50000`, `ppr_percent=10`, `bonus_pool_mode=percent_of_profit`).
3. Clicar **Recalcular** → backend processa, UI mostra lucro/pote e atualiza tabela mensal a partir de `ppr_period_months`.
4. Adicionar ajuste com `effective_date` em fev/2026 → status do período vira `stale`; recalcular incorpora ajuste.
5. Preencher scorecards → recalcular → `bonus_amount` por colaborador aparece em Bônus.
6. Aba NPS funciona; tokens carregam `period_id`.
7. `/dashboard/nps` redireciona para `/dashboard/goals?tab=nps`.
8. Fechar período trava edição; reabrir exige justificativa e gera log de auditoria.
9. Drill-down em qualquer mês do Financeiro mostra ids/datas dos lançamentos via `source_snapshot`.
10. Meta de R$ 50.000 nunca bloqueia o pagamento na UI — texto reflete isso.

---

Aprovar para eu começar pela criação dos hooks e do `PerformancePPRPage`.
