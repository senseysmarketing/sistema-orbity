

# Integração Asaas + Régua de Cobrança Automática (Revisado)

## Resumo
Gateway de pagamentos Asaas (PIX/Boleto) híbrido com fluxo manual, régua de cobrança automática com templates separados, e safety switch para override manual.

## Migration (SQL)

```sql
CREATE TABLE public.agency_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  active_gateway TEXT NOT NULL DEFAULT 'manual' CHECK (active_gateway IN ('manual', 'asaas')),
  asaas_api_key TEXT,
  asaas_sandbox BOOLEAN DEFAULT true,
  reminder_before_enabled BOOLEAN DEFAULT false,
  reminder_before_days INTEGER DEFAULT 3,
  reminder_due_date_enabled BOOLEAN DEFAULT false,
  reminder_overdue_enabled BOOLEAN DEFAULT false,
  reminder_overdue_days INTEGER DEFAULT 1,
  block_access_enabled BOOLEAN DEFAULT false,
  block_access_days INTEGER DEFAULT 5,
  whatsapp_template_reminder TEXT,
  whatsapp_template_overdue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.agency_payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency admins manage payment settings"
  ON public.agency_payment_settings FOR ALL TO authenticated
  USING (public.is_agency_admin(agency_id))
  WITH CHECK (public.is_agency_admin(agency_id));

ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS pix_copy_paste TEXT;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
```

## Novos Arquivos

### 1. `src/hooks/usePaymentGateway.tsx`
Hook que busca `agency_payment_settings` para a agência atual. Expõe `gateway`, `settings`, `isAsaasActive`, `loading`.

### 2. `src/components/settings/AsaasIntegration.tsx`
Card na aba Integrações:
- Master Switch "Ativar Asaas como gateway principal"
- Input API Key (mascarado)
- Switch Sandbox/Produção
- Botão "Salvar e Conectar" com badge de status
- Salva em `agency_payment_settings`

### 3. `src/components/admin/BillingAutomationSettings.tsx`
Sheet lateral com:
- Switches e inputs numéricos para cada evento da régua
- **Dois Textareas separados**:
  - "Template para Lembretes (Antes/No Dia)" — variáveis `{nome_cliente}`, `{valor}`, `{data_vencimento}`, `{link_pagamento}`
  - "Template para Atrasos (Cobrança)" — mesmas variáveis
- Dica contextual: "Gateway Manual? Use sua chave PIX. Gateway Asaas? Use {link_pagamento}."

## Arquivos Modificados

### 4. `src/pages/Settings.tsx`
Renderizar `<AsaasIntegration />` no grid de integrações

### 5. `src/components/admin/PaymentSheet.tsx`
- Importar `usePaymentGateway`
- **Gateway manual**: fluxo atual inalterado
- **Gateway Asaas**:
  - Botão "Gerar Cobrança (Asaas)" (mock: toast "Em breve")
  - Se `asaas_payment_id` existe: "Copiar Link de Pagamento" + badge status
  - Banner "Baixa automática habilitada via Asaas"
  - **Safety Switch**: botão ghost/menu `...` com "Forçar Baixa Manual (Override)" que abre `AlertDialog` avisando que não cancela a cobrança no Asaas, apenas atualiza localmente. Se confirmado, permite fluxo manual normal.

### 6. `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`
Botão "Régua de Cobrança" que abre `BillingAutomationSettings`

## Arquivos totais (6 + migration)
- Migration SQL
- `src/hooks/usePaymentGateway.tsx` (novo)
- `src/components/settings/AsaasIntegration.tsx` (novo)
- `src/components/admin/BillingAutomationSettings.tsx` (novo)
- `src/pages/Settings.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/components/admin/CommandCenter/AdvancedFinancialSheet.tsx`

