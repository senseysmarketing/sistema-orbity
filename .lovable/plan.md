

# Correções no Módulo PPR — Regime de Caixa e Elegibilidade

## Resumo
Duas correções de lógica de negócios: (1) trocar filtro de `due_date` para `paid_date` nas queries financeiras do PPR, e (2) adicionar flag `eligible_for_ppr` nos funcionários para excluir sócios da divisão do bônus.

## 1. Migration — Nova coluna `eligible_for_ppr`

```sql
ALTER TABLE public.employees ADD COLUMN eligible_for_ppr boolean NOT NULL DEFAULT true;
```

Sem RLS adicional necessária — a tabela já tem políticas.

## 2. PPRDashboard.tsx — Regime de Caixa

Na `fetchFinancialData` (linhas 179-205), trocar filtros e selects:

**client_payments** (tem `paid_date` e `amount_paid`):
- Select: `"amount, amount_paid"` 
- Filtro: `.gte("paid_date", monthStart).lte("paid_date", monthEnd)`
- Reduce: `sum + (p.amount_paid || p.amount || 0)`

**expenses** (tem `paid_date`, sem `amount_paid`):
- Filtro: `.gte("paid_date", monthStart).lte("paid_date", monthEnd)`
- Reduce: mantém `sum + (e.amount || 0)` (sem coluna `amount_paid`)

**salaries** (tem `paid_date`, sem `amount_paid`):
- Filtro: `.gte("paid_date", monthStart).lte("paid_date", monthEnd)`
- Reduce: mantém `sum + (s.amount || 0)` (sem coluna `amount_paid`)

## 3. PPRDashboard.tsx — Filtro de elegibilidade

Na `fetchEmployees` (linha 152), adicionar:
```typescript
.eq("eligible_for_ppr", true)
```

## 4. EmployeeForm.tsx — Switch de elegibilidade

- Adicionar `eligible_for_ppr: true` ao state `formData`
- Preencher com `employee.eligible_for_ppr` ao editar
- Incluir no objeto `data` do submit
- Novo Switch na UI: "Elegível para PPR / Bônus" com descrição "Desmarque para sócios ou funcionários não participantes"
- Imports `Switch` e `Label` já existem no arquivo

## Arquivos alterados
1. **Migration SQL** — `ALTER TABLE employees ADD COLUMN eligible_for_ppr`
2. **`src/components/goals/PPRDashboard.tsx`** — `paid_date` + `amount_paid` + filtro elegibilidade
3. **`src/components/admin/EmployeeForm.tsx`** — switch PPR

