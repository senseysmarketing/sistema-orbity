

# SaaS Tracker com Deteccao de Anomalias — Plano Blindado

## Resumo
Evoluir a aba "Assinaturas" para SaaS Tracker com kill switch, deteccao de anomalias com protecao cambial, suporte a moeda estrangeira no formulario, e ajustes no monthly-closure. Inclui as 3 blindagens solicitadas.

## 1. Migration — Schema

```sql
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS base_value NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC;

-- Trigger de validacao
CREATE OR REPLACE FUNCTION validate_expense_subscription_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.subscription_status IS NOT NULL AND
     NEW.subscription_status NOT IN ('active', 'paused', 'canceled') THEN
    RAISE EXCEPTION 'Invalid subscription_status: %', NEW.subscription_status;
  END IF;
  IF NEW.currency IS NOT NULL AND
     NEW.currency NOT IN ('BRL', 'USD', 'EUR') THEN
    RAISE EXCEPTION 'Invalid currency: %', NEW.currency;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_expense_subscription
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION validate_expense_subscription_fields();

-- Backfill de dados historicos (Blindagem 3)
UPDATE public.expenses
SET base_value = amount,
    subscription_status = 'active',
    currency = 'BRL'
WHERE expense_type = 'recorrente' AND base_value IS NULL;
```

## 2. `AdvancedExpenseSheet.tsx` — SaaS Tracker + Anomalias

### Aba "Assinaturas" vira SaaS Tracker
- Query busca tambem `subscription_status`, `base_value`, `currency`, `exchange_rate`
- Remover filtro `is_active: true`, mostrar pausadas tambem
- Grid de cards (`grid grid-cols-1 md:grid-cols-2 gap-3`)
- Cada card:
  - Nome, categoria badge, valor base, badge de moeda (USD/EUR se aplicavel)
  - **Switch** para toggle `subscription_status` (active ↔ paused)
  - `useMutation` com invalidacao otimista
  - **Blindagem 2 — Kill Switch cancela pendentes**: ao pausar, executar UPDATE em contas filhas com `parent_expense_id = id` e `status = 'pending'` → `status = 'cancelled'`
  - Cards pausados: `opacity-60`, borda pontilhada, badge verde "Economia projetada: R$ X/ano"
  - Cards cancelados: `opacity-40`, cinza
- KPIs no topo: "Ativo: R$ X/mes" vs "Pausado: R$ Y/mes (economia)"

### Componente `ExpenseAnomalyAlerts` no topo da Aba "Contas do Mes"
- **Blindagem 1 — Matematica cambial correta**:
  - Para cada despesa do mes com `sourceType === 'expense'`, buscar a despesa mestra ou historico via `parent_expense_id`
  - Se `currency !== 'BRL'`: buscar ultima fatura paga (mesmo `parent_expense_id`, status `paid`, mes anterior). Comparar `amount` atual vs `amount` anterior em BRL
  - Se nao houver historico: usar `base_value * exchange_rate * 1.15` como fallback
  - Se `currency === 'BRL'`: comparar diretamente `amount` vs `base_value * 1.15`
  - Gatilho: aumento > 15% → `<Alert variant="destructive">` com icone `TrendingUp`
  - Texto: "Atencao: [Nome] veio R$ [diff] mais cara este mes (aumento de X%)"

## 3. `ExpenseForm.tsx` — Campos de moeda e cotacao
- Adicionar ao formData: `currency` (default 'BRL'), `base_value`, `exchange_rate`
- Select de moeda (BRL/USD/EUR)
- Quando `currency !== 'BRL'`: campo "Cotacao utilizada" + preview "Valor estimado em Reais: R$ X"
- Salvar `base_value`, `currency`, `exchange_rate` no insert/update
- Para recorrentes: salvar `subscription_status: 'active'` por default

## 4. `monthly-closure/index.ts` — Respeitar subscription_status
- Na secao de geracao de despesas recorrentes (linha ~127), adicionar filtro:
  `.in('subscription_status', ['active'])` (nao incluir null para forcar backfill)
- Atualizar: apos backfill, todos recorrentes terao `subscription_status = 'active'`

## Arquivos modificados
1. Migration SQL (novas colunas + trigger + backfill)
2. `src/components/admin/CommandCenter/AdvancedExpenseSheet.tsx`
3. `src/components/admin/ExpenseForm.tsx`
4. `supabase/functions/monthly-closure/index.ts`

## Design System
- Cards pausados: `opacity-60`, borda pontilhada (`border-dashed`), badge verde de economia
- Cards cancelados: `opacity-40`, cinza
- Alertas de anomalia: `<Alert variant="destructive">` com `TrendingUp` vermelho
- Moeda estrangeira: badge azul "USD" ou "EUR" no card

