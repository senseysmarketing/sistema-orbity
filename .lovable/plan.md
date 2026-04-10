

# Integração Conexa — Gateway de Pagamentos

## Resumo
Adicionar suporte ao gateway Conexa com a mesma arquitetura híbrida do Asaas: migrations de banco, componente de configuração, hook atualizado, PaymentSheet com renderização condicional, e compatibilidade na régua de cobrança.

## 1. Migration SQL

```sql
-- Atualizar constraint do gateway
ALTER TABLE public.agency_payment_settings 
  DROP CONSTRAINT IF EXISTS agency_payment_settings_active_gateway_check;
ALTER TABLE public.agency_payment_settings 
  ADD CONSTRAINT agency_payment_settings_active_gateway_check 
  CHECK (active_gateway IN ('manual', 'asaas', 'conexa'));

-- Campos Conexa na config da agência
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_api_key TEXT,
  ADD COLUMN IF NOT EXISTS conexa_token TEXT;

-- ID do cliente no Conexa
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS conexa_customer_id TEXT;

-- Colunas de cobrança Conexa nos pagamentos
ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS conexa_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS conexa_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS conexa_pix_copy_paste TEXT;
```

## 2. Novo componente `src/components/settings/ConexaIntegration.tsx`
- Clone da estrutura do `AsaasIntegration.tsx`
- Campos: `conexa_api_key`, `conexa_token` (mascarados)
- Master Switch que seta `active_gateway: 'conexa'`
- Badge Conectado/Desconectado
- Ícone DollarSign com cor diferenciada (azul em vez de verde)

## 3. `src/pages/Settings.tsx`
- Importar e renderizar `<ConexaIntegration />` ao lado do Asaas na grid de integrações

## 4. `src/hooks/usePaymentGateway.tsx`
- Atualizar tipo `active_gateway` para `'manual' | 'asaas' | 'conexa'`
- Adicionar `isConexaActive` ao retorno (`gateway === 'conexa'`)
- Adicionar campos `conexa_api_key`, `conexa_token` ao `PaymentSettings` interface e defaults

## 5. `src/components/admin/PaymentSheet.tsx`
- Importar `isConexaActive` do hook
- Duplicar bloco Asaas para Conexa: se `gateway === 'conexa'` e editando:
  - Se `payment.conexa_charge_id` existe → botões "Copiar Link (Conexa)" e "Copiar PIX"
  - Senão → botão "Gerar Cobrança (Conexa)"
- Banner de baixa automática: exibir para Conexa com mesma lógica (texto "Baixa automática via Conexa Webhook" + override manual)

## 6. `src/components/admin/BillingAutomationSettings.tsx`
- Atualizar texto do hint contextual para incluir Conexa:
  - `isConexaActive` → mensagem similar ao Asaas sobre `{link_pagamento}`
  - Ajustar condição: `isAsaasActive || isConexaActive`

## Arquivos modificados (5 + 1 novo + migration)
- Migration SQL
- `src/hooks/usePaymentGateway.tsx`
- `src/components/settings/ConexaIntegration.tsx` (novo)
- `src/pages/Settings.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/components/admin/BillingAutomationSettings.tsx`

