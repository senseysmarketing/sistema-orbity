

# Implementar Instancia vs Heranca + Acoes Avancadas na CashFlowTable

## Diagnostico

A CashFlowTable atual tem apenas o botao "Dar Baixa" (MarkAsPaidPopover) -- faltam o dropdown de acoes e a acao "Cancelar/Perdoar". Alem disso, o enum `payment_status` no banco so aceita `pending | paid | overdue`, precisamos adicionar `cancelled`.

## Alteracoes

### 1. Migracao SQL -- adicionar `cancelled` ao enum `payment_status`
```sql
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';
```
Isso permite que `client_payments`, `expenses` e `salaries` usem o status `cancelled`.

### 2. Hook `useFinancialMetrics.tsx` -- adicionar mutacao `cancelItem` e filtrar cancelados
- Adicionar `cancelItemMutation` que atualiza o status para `cancelled` na tabela correspondente (client_payments, expenses, salaries)
- Filtrar itens com status `cancelled` do `unifiedCashFlow` para que nao aparecam nas somas de MRR, despesas, inadimplencia
- Adicionar `CANCELLED` ao tipo `CashFlowItem.status`
- Retornar `cancelItem` e `isCancellingItem`

### 3. `CashFlowTable.tsx` -- adicionar DropdownMenu com acoes por linha
Na ultima coluna de cada linha, substituir o botao isolado de "Dar Baixa" por um layout com:
- Botao "Dar Baixa" (CheckCircle2, verde) -- ja existe via MarkAsPaidPopover, manter para itens nao pagos
- DropdownMenu (MoreHorizontal) com:
  - "Editar Detalhes" (Pencil) -- chama callback `onEditItem(item)`
  - "Cancelar / Perdoar" (Ban, texto vermelho) -- abre AlertDialog de confirmacao, depois chama `onCancelItem`
- Itens pagos: mostram apenas o dropdown (sem botao de baixa)
- Itens cancelados: mostram badge "Cancelado" cinza, sem acoes

Props adicionais: `onEditItem`, `onCancelItem`, `isCancellingItem`

### 4. `Admin.tsx` -- conectar callbacks de edicao
- Passar `onEditItem` para CashFlowTable que mapeia o `sourceType` do item para abrir o form correto:
  - `client_payment` → abre PaymentForm com o payment selecionado (edita instancia, NAO o clients.monthly_value)
  - `expense` → abre ExpenseForm com a expense selecionada
  - `salary` → abre SalaryForm com o salary selecionado
- Passar `onCancelItem` que chama `metrics.cancelItem`

### 5. Tipos -- atualizar `CashFlowItem`
Adicionar `'CANCELLED'` ao union type de `status`.

## Arquivos modificados
- **Migracao SQL**: adicionar `cancelled` ao enum
- `src/hooks/useFinancialMetrics.tsx`: mutacao cancelItem + filtro de cancelados + tipo atualizado
- `src/components/admin/CommandCenter/CashFlowTable.tsx`: DropdownMenu + AlertDialog de cancelamento
- `src/pages/Admin.tsx`: conectar onEditItem e onCancelItem

## Principio "Instancia vs Heranca"
Todas as mutacoes (markAsPaid, cancelItem, editItem) operam EXCLUSIVAMENTE nas tabelas de instancia mensal (`client_payments`, `expenses`, `salaries`). Nunca tocam nas tabelas mestras (`clients.monthly_value`, `employees.base_salary`, despesas recorrentes pai).

