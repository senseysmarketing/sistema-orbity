

# Expandir Gestão de Cobranças — Revisão com 3 Regras Adicionais

## Resumo das adições ao plano original

O plano original (gateway badges, alertas, soft delete) continua válido. As 3 regras adicionais reforçam a integridade dos dados:

## 1. Migration SQL — Constraint de Status (NOVA)

Verificação feita: **não existe** CHECK constraint nas colunas `status` de `client_payments`, `expenses` nem `salaries`. Os valores são TEXT livre. Criar migration adicionando constraint explícito em todas as 3 tabelas:

```sql
ALTER TABLE public.client_payments
  ADD CONSTRAINT client_payments_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));

ALTER TABLE public.salaries
  ADD CONSTRAINT salaries_status_check
  CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'));
```

## 2. Prevenção de "Receita Fantasma" — Auditoria nos hooks

### `useFinancialMetrics.tsx`
- **`unifiedCashFlow`** (linhas 313-346): Já filtra `cancelled` com `return` — mas os itens cancelados **devem aparecer** na tabela (regra 3). Alterar para **incluir** cancelled no cashFlow mas mantê-los excluídos dos cálculos numéricos.
- **`totalExpenses`** (linha 251): Atualmente soma TODAS as expenses sem filtrar cancelled. Corrigir: `expenses.filter(e => e.status !== 'cancelled').reduce(...)`.
- **`totalPayroll`** (linha 256): Idem para salários: `salaries.filter(s => s.status !== 'cancelled').reduce(...)`.
- **`delinquencyRate`** (linha 268): Já filtra por `status === 'overdue'`, OK.

### `useAdvancedAnalytics.tsx`
- Já busca apenas `status = 'paid'` no Supabase (`.eq('status', 'paid')`), portanto cancelled nunca entra. OK, sem alteração.

## 3. Visualização de Cancelled no CashFlowTable

### `useFinancialMetrics.tsx` — Incluir cancelled no cashFlow
- Remover os `if (status === 'cancelled') return;` das linhas 314, 331, 346
- Os itens cancelados agora aparecem no array `unifiedCashFlow` com status `CANCELLED`

### `CashFlowTable.tsx` — Filtro e estilo visual
- **Filtro** (linha 43): Remover `if (item.status === 'CANCELLED') return false;` — cancelled deve aparecer no filtro "Este Mês"
- **Estilo da linha**: Quando `item.status === 'CANCELLED'`, aplicar `opacity-50` no `<TableRow>`
- **Valor numérico**: Aplicar `line-through text-muted-foreground` no `<TableCell>` do valor
- **Ações**: Esconder botões de "Marcar como Pago" e menu de cancelamento para itens cancelled

## 4. Hard Delete → Soft Delete no Admin.tsx (do plano original)

- **`handleDeletePaymentById`** (linha 187): Trocar `.delete()` por `.update({ status: 'cancelled' })`
- **`confirmDeletePayment`** (linha 208): Trocar `.delete()` por `.update({ status: 'cancelled' })`
- Alterar toasts de "Excluído" para "Cancelado"

## 5. Gateway Badges + Alertas (do plano original, mantidos)

- Badge de origem (Manual/Asaas/Conexa) no CashFlowTable e ClientPaymentHistory
- Alerta amarelo no PaymentSheet ao editar cobrança com gateway
- Mensagem dinâmica no AlertDialog de cancelamento

## Arquivos modificados
- Migration SQL (novo)
- `src/hooks/useFinancialMetrics.tsx`
- `src/components/admin/CommandCenter/CashFlowTable.tsx`
- `src/components/admin/ClientPaymentHistory.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/pages/Admin.tsx`

