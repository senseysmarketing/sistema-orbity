

# Multi-Gateway por Cliente e por Pagamento

## 1. Migration SQL

- `clients`: add `default_billing_type TEXT DEFAULT 'manual'`
- `client_payments`: add `billing_type TEXT DEFAULT 'manual'`
- `agency_payment_settings`: add `asaas_enabled BOOLEAN DEFAULT false`, `conexa_enabled BOOLEAN DEFAULT false`
- Validation triggers for both tables (only allow 'manual', 'asaas', 'conexa')
- Backfill: set `asaas_enabled = true` where `active_gateway = 'asaas'`, same for conexa

## 2. usePaymentGateway.tsx

- Add `asaas_enabled`, `conexa_enabled` to `PaymentSettings` interface
- Compute `enabledGateways: string[]` — always includes 'manual'; includes 'asaas' if `asaas_enabled && asaas_api_key`; 'conexa' if `conexa_enabled && conexa_api_key`
- Base `isAsaasActive`/`isConexaActive` on new booleans
- Export `enabledGateways`

## 3. AsaasIntegration.tsx e ConexaIntegration.tsx

- Switch "Ativar gateway" saves `asaas_enabled`/`conexa_enabled` instead of changing `active_gateway`
- Remove exclusivity logic (both can be active simultaneously)

## 4. ClientForm.tsx

- Add `default_billing_type` to form data (default 'manual')
- Add `<Select>` "Forma de Faturamento Padrao" with dynamic options from `enabledGateways`
- If only 'manual' available, show subtle note about gateway configuration

## 5. PaymentForm.tsx

- Add `billing_type` to formData (default 'manual')
- Add `<Select>` "Metodo de Faturamento" with options from `enabledGateways`
- On client selection, auto-fill `billing_type` with `client.default_billing_type`
- Include `billing_type` in insert/update payload

## 6. PaymentSheet.tsx

- Add `billingType` to form state
- Auto-fill with `client.default_billing_type` on client selection or edit open
- Show gateway action buttons based on `billingType` value
- Maintain Pre-Flight Check (document/zip_code)
- Save `billing_type` in insert/update

### 6.1 Fallback Inteligente do Cliente (NOVO)

Ao auto-preencher o `billing_type` baseado no cliente, verificar se a opcao ainda e valida para a agencia:

```typescript
const resolvedBillingType = enabledGateways.includes(client.default_billing_type)
  ? client.default_billing_type
  : 'manual';
```

Usar `resolvedBillingType` para preencher o formulario, evitando crashes no `<Select>` caso a agencia tenha desativado o gateway preferido do cliente. Aplicar a mesma logica em `PaymentForm.tsx`.

## 7. CashFlowTable e useFinancialMetrics

- Add `billingType` to `CashFlowItem`
- Populate from `p.billing_type` in payments
- Display origin Badge (Manual/Asaas/Conexa) for INCOME items

## Arquivos modificados (7 + migration)
- Migration SQL (novo)
- `src/hooks/usePaymentGateway.tsx`
- `src/components/settings/AsaasIntegration.tsx`
- `src/components/settings/ConexaIntegration.tsx`
- `src/components/admin/ClientForm.tsx`
- `src/components/admin/PaymentForm.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/hooks/useFinancialMetrics.tsx` + `CashFlowTable.tsx`

