

# Ciclo de Vida do Pagamento: Webhook Fix + Liquidação Conexa

## Resumo
Três correções para fechar o ciclo financeiro: fix na math do webhook, novos campos de configuração para baixa Conexa, e implementação da liquidação manual via PATCH /charge/settle.

## Alterações

### 1. Correção Matemática no Webhook
**Arquivo**: `supabase/functions/payment-webhook/index.ts` (linha 138)

Trocar `updateData.amount_paid = netValue` por `updateData.amount_paid = value` para registrar o valor bruto pago pelo cliente (incluindo juros/multa). O `gateway_fee` continua calculado como `value - netValue`.

### 2. Migration: Novos campos em `agency_payment_settings`
```sql
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_account_id integer,
  ADD COLUMN IF NOT EXISTS conexa_receiving_method_id integer;
```

### 3. UI: Campos no ConexaIntegration.tsx
- Adicionar states `accountId` e `receivingMethodId`
- Dois novos Inputs: "ID da Conta Bancária Padrão" e "ID do Meio de Recebimento Padrão"
- Incluir `conexa_account_id` e `conexa_receiving_method_id` no `handleSave`

### 4. Implementar Liquidação Conexa no settle-gateway-payment
**Arquivo**: `supabase/functions/settle-gateway-payment/index.ts` (linhas 120-122)

Substituir o TODO por:
- Buscar `conexa_subdomain`, `conexa_api_key`, `conexa_account_id`, `conexa_receiving_method_id` das settings
- PATCH `https://{subdomain}.conexa.app/index.php/api/v2/charge/settle/{conexa_charge_id}` com payload:
```json
{
  "settlementDate": paidDate,
  "receivingMethod": { "id": conexa_receiving_method_id, "installmentsQuantity": 1 },
  "accountId": conexa_account_id,
  "paidAmount": paidAmount,
  "sendEmail": false
}
```
- Em caso de falha, retornar 502 bloqueando a atualização local

### 5. Deploy
Deploy individual de `payment-webhook` e `settle-gateway-payment`.

## Resumo de arquivos
- 1 migration (2 colunas novas)
- 2 edge functions alteradas (webhook + settle)
- 1 componente frontend (ConexaIntegration.tsx)

