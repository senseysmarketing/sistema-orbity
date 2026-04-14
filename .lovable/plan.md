

# Remoção da Constraint Única + Ajuste de Upserts

## Problema
O índice único `uniq_client_payment_month_idx` impede múltiplas cobranças para o mesmo cliente no mesmo mês, bloqueando casos reais de negócio (mensalidade + serviço avulso, refaturamento, etc.).

## Alterações

### 1. Migration SQL
```sql
DROP INDEX IF EXISTS public.uniq_client_payment_month_idx;
```
Isso remove a trava que causa o erro 500.

### 2. Código — trocar `upsert` por `insert` (2 arquivos)

**`src/pages/Admin.tsx` (linha ~120)**: Trocar `.upsert(rows, { onConflict: ... })` por `.insert(rows)`. Como a constraint não existirá mais, o upsert perderia sentido. Para evitar duplicatas acidentais na geração automática mensal, adicionar um `SELECT` prévio que verifica se já existem pagamentos para aquele mês antes de inserir.

**`src/components/contracts/ContractPreview.tsx` (linha ~283)**: Mesma troca — `.upsert(payments, { onConflict: ... })` por `.insert(payments)`.

### 3. Frontend — proteção contra double-submit
O hook `useCreatePayment.ts` já usa `loading` state e `setLoading(true)` no início. Verificar que o botão que dispara `createPayment` está desabilitado com `disabled={loading}` — o código atual já faz isso corretamente (o botão passa `disabled={saving}` / `disabled={loading}`). Nenhuma alteração necessária aqui.

### 4. Edge Function
A edge function `create-gateway-charge` usa `.insert()` direto (não upsert), então não precisa de alteração — o erro era causado pelo índice no banco.

## Resumo
- 1 migration (drop index)
- 2 arquivos com troca de upsert → insert + check prévio
- 0 mudanças na edge function

