

# Faturamento Híbrido Conexa: Venda + Cobrança (Full-Stack)

## Resumo
Implementar o fluxo de dois passos do Conexa (POST /sale -> POST /charge -> GET /charge/{id}) com suporte a faturamento automático e manual, gerenciamento correto de IDs e atualização de status.

## Alterações

### 1. Nova Edge Function `invoice-conexa-sale`
**Arquivo**: `supabase/functions/invoice-conexa-sale/index.ts`

Recebe `{ payment_id }`. Fluxo:
- Autentica via JWT do header Authorization
- Busca o `client_payment` pelo ID (via adminClient) com `conexa_charge_id` preenchido
- Busca `agency_payment_settings` pela `agency_id` do pagamento
- POST `{baseUrl}/charge` com body `{ salesIds: [parseInt(conexa_charge_id, 10)], dueDate, notes }`
- Resposta 201 retorna `{ id: chargeId }`
- GET `{baseUrl}/charge/{chargeId}` para obter `chargeUrl` e `billetUrl`
- UPDATE `client_payments`: sobrescrever `conexa_charge_id` com o novo chargeId, salvar `conexa_invoice_url = chargeUrl`, `conexa_pix_copy_paste = billetUrl`, forçar `status = 'pending'`
- Retorna sucesso com URLs
- Erros da API Conexa são repassados ao frontend

### 2. Refatoração da `create-gateway-charge`
**Arquivo**: `supabase/functions/create-gateway-charge/index.ts`

- Aceitar novo campo `auto_invoice` no body (default `true`)
- Após criar a venda Conexa (POST /sale):
  - Se `auto_invoice === true`: executar internamente POST /charge -> GET /charge/{id} -> popular `conexa_charge_id` com chargeId final (sobrescrevendo o saleId), `conexa_invoice_url` e `conexa_pix_copy_paste`
  - Se `auto_invoice === false`: salvar o saleId em `conexa_charge_id` temporariamente (sem URLs)
- Extrair helper `invoiceConexaSale(saleId, dueDate, notes, baseUrl, apiKey)` reutilizável nas duas funções

### 3. `supabase/config.toml`
Adicionar `[functions.invoice-conexa-sale]` com `verify_jwt = false`

### 4. Toggle no PaymentSheet (formulário de criação)
**Arquivo**: `src/components/admin/PaymentSheet.tsx`

- Novo state `autoInvoice` (default `true`)
- Mostrar Switch "Faturar Automaticamente" apenas quando `billingType === 'conexa'` e for criação (nao edição)
- Passar `auto_invoice` no payload do `createPaymentHook`

### 5. Hook `useCreatePayment` - propagar `auto_invoice`
**Arquivo**: `src/hooks/useCreatePayment.ts`

- Adicionar `auto_invoice?: boolean` na interface `CreatePaymentData`
- Incluir `auto_invoice` no payload enviado à edge function

### 6. Propagar `conexa_invoice_url` e `conexa_charge_id` no CashFlowItem
**Arquivo**: `src/hooks/useFinancialMetrics.tsx`

- Adicionar `invoiceUrl?: string` e `conexaChargeId?: string` na interface `CashFlowItem`
- No mapeamento de payments, preencher `invoiceUrl` com `conexa_invoice_url || invoice_url` e `conexaChargeId` com `conexa_charge_id`

### 7. Botão "Emitir Fatura Conexa" no CashFlowTable
**Arquivo**: `src/components/admin/CommandCenter/CashFlowTable.tsx`

- No DropdownMenu, adicionar opção "Emitir Fatura Conexa"
- Visível se: `billingType === 'conexa'` E `!invoiceUrl` E `conexaChargeId` presente E status !== PAID/CANCELLED
- Ao clicar: `supabase.functions.invoke('invoice-conexa-sale', { body: { payment_id: item.sourceId } })`
- State `isInvoicing` para loading + toast de sucesso/erro + refetch dados

## Regras de Negócio Críticas
- **Sobrescrita de ID**: `conexa_charge_id` começa com saleId, é substituído pelo chargeId após POST /charge
- **Status**: Forçar `status = 'pending'` após faturamento bem-sucedido
- **Parse**: `salesIds: [parseInt(saleId, 10)]` no payload do /charge
- **Erros**: Mensagens da API Conexa repassadas ao frontend

## Resumo de arquivos
- 1 nova edge function (`invoice-conexa-sale`)
- 1 edge function refatorada (`create-gateway-charge`)
- 1 config (`config.toml`)
- 4 arquivos frontend (PaymentSheet, useCreatePayment, CashFlowTable, useFinancialMetrics)
- 0 migrations

