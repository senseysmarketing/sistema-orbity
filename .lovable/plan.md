

# Fase 1 — Régua de Cobrança Multi-Gateway

## Migration SQL

Add 9 columns to `agency_payment_settings` and 1 to `clients`, then copy existing template data based on the active gateway:

```sql
-- New columns
ALTER TABLE agency_payment_settings
  ADD COLUMN manual_billing_enabled boolean DEFAULT false,
  ADD COLUMN manual_template_reminder text,
  ADD COLUMN manual_template_overdue text,
  ADD COLUMN conexa_billing_enabled boolean DEFAULT false,
  ADD COLUMN conexa_template_reminder text,
  ADD COLUMN conexa_template_overdue text,
  ADD COLUMN asaas_billing_enabled boolean DEFAULT false,
  ADD COLUMN asaas_template_reminder text,
  ADD COLUMN asaas_template_overdue text;

ALTER TABLE clients ADD COLUMN billing_automation_enabled boolean DEFAULT true;

-- Retrocompatibilidade: copy old global templates to the active gateway's columns
UPDATE agency_payment_settings
SET
  manual_template_reminder = CASE WHEN active_gateway = 'manual' THEN whatsapp_template_reminder END,
  manual_template_overdue  = CASE WHEN active_gateway = 'manual' THEN whatsapp_template_overdue END,
  conexa_template_reminder = CASE WHEN active_gateway = 'conexa' THEN whatsapp_template_reminder END,
  conexa_template_overdue  = CASE WHEN active_gateway = 'conexa' THEN whatsapp_template_overdue END,
  asaas_template_reminder  = CASE WHEN active_gateway = 'asaas'  THEN whatsapp_template_reminder END,
  asaas_template_overdue   = CASE WHEN active_gateway = 'asaas'  THEN whatsapp_template_overdue END,
  -- Also enable billing for whichever gateway had templates
  manual_billing_enabled = CASE WHEN active_gateway = 'manual' AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END,
  conexa_billing_enabled = CASE WHEN active_gateway = 'conexa' AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END,
  asaas_billing_enabled  = CASE WHEN active_gateway = 'asaas'  AND whatsapp_template_reminder IS NOT NULL THEN true ELSE false END
WHERE whatsapp_template_reminder IS NOT NULL OR whatsapp_template_overdue IS NOT NULL;
```

## `src/hooks/usePaymentGateway.tsx`

Add the 9 new fields to `PaymentSettings` interface and `defaultSettings`.

## `src/components/admin/BillingAutomationSettings.tsx`

- Import `Tabs, TabsList, TabsTrigger, TabsContent`
- Add 9 new fields to `FormData` type and `defaultFormData`
- Replace lines 248-304 (gateway hint + 2 template textareas) with a `<Tabs>` component:
  - 3 tabs: Manual, Conexa, Asaas
  - Each tab: Switch for `{gw}_billing_enabled` + 2 Textareas for `{gw}_template_reminder` / `{gw}_template_overdue` + variable badges
  - Manual tab: extra note about PIX instead of `{link_pagamento}`
- Update `useEffect` sync and `insertVariable` to handle per-gateway fields
- Update `handleSave` (already saves full `formData`, just needs the new fields included)

## `src/components/admin/ClientForm.tsx`

- Add `billing_automation_enabled: true` to `initialFormData`
- Populate from `client.billing_automation_enabled` in the editing `useEffect`
- Add Switch in the "Configurações de Cobrança" section (after line 661, before the gateway-only hint)
- Include `billing_automation_enabled` in the `data` object of `handleSubmit`

## Files changed
1. 1 SQL migration (schema + data backfill)
2. `src/hooks/usePaymentGateway.tsx`
3. `src/components/admin/BillingAutomationSettings.tsx`
4. `src/components/admin/ClientForm.tsx`

