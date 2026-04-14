

# Timestamp de Pagamento — Tooltip no Badge "Pago"

## Resumo
Adicionar coluna `paid_at` (timestamptz) nas tabelas, capturar o timestamp completo no webhook, e exibir via Tooltip no Badge "Pago" do CashFlowTable.

## Ordem de execução (crítica)
1. Migration primeiro (banco)
2. Código frontend (interface + UI)
3. Edge Function por último (deploy)

## Alterações

### 1. Migration SQL
```sql
ALTER TABLE client_payments ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE salaries ADD COLUMN IF NOT EXISTS paid_at timestamptz;
```

### 2. `supabase/functions/payment-webhook/index.ts` (linhas 151-155)
Substituir o bloco `if (newStatus === "paid")` para capturar timestamp completo:
```typescript
if (newStatus === "paid") {
  updateData.amount_paid = value;
  updateData.gateway_fee = Math.round((value - netValue) * 100) / 100;

  let paidTimestamp: string;
  if (gateway === "conexa") {
    paidTimestamp = body.paymentOperationDate || body.paymentDate || new Date().toISOString();
  } else {
    paidTimestamp = body.payment?.paymentDate || new Date().toISOString();
  }

  updateData.paid_at = paidTimestamp;
  updateData.paid_date = paidTimestamp.split("T")[0];
}
```

### 3. `src/hooks/useFinancialMetrics.tsx`
- Adicionar `paidAt?: string` na interface `CashFlowItem` (linha 99)
- No mapeamento de payments (linha 391), adicionar:
  ```typescript
  paidAt: (p as any).paid_at || p.paid_date || undefined,
  ```

### 4. `src/components/admin/CommandCenter/CashFlowTable.tsx`
- Importar `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` do shadcn
- Alterar `statusBadge` para aceitar `paidAt` opcional. Quando `PAID` e `paidAt` existir, envolver Badge em Tooltip com "Pago em dd/MM/yyyy às HH:mm"
- Envolver o conteúdo da tabela em `<TooltipProvider>`
- Atualizar chamada na linha 190: `statusBadge(item.status, item.paidAt)`

## Arquivos alterados
- 1 migration (3 ALTER TABLEs)
- `supabase/functions/payment-webhook/index.ts`
- `src/hooks/useFinancialMetrics.tsx`
- `src/components/admin/CommandCenter/CashFlowTable.tsx`

