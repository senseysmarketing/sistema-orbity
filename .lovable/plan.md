
# Correção e Aprimoramento da Régua de Cobrança

## 1. Migration SQL
Adicionar colunas de canal na `agency_payment_settings`:
```sql
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS notify_via_email BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_via_whatsapp BOOLEAN DEFAULT true;
```

## 2. usePaymentGateway.tsx
- Adicionar `notify_via_email` e `notify_via_whatsapp` à interface `PaymentSettings` e ao `defaultSettings`

## 3. BillingAutomationSettings.tsx — Refatoração completa

**Correção de estado**: Substituir os ~10 estados individuais por um único `formData` object inicializado via `useEffect` quando `settings` carrega. Todos os switches e inputs amarrados a `formData`. Botão Salvar envia `formData` inteiro.

**Nova seção "Canais de Envio"** (antes dos cards de eventos):
- Switch "Notificar por E-mail" (`notify_via_email`)
- Switch "Notificar por WhatsApp" (`notify_via_whatsapp`)
  - Se ativado, mostrar status da conexão usando `useWhatsApp()`:
    - Conectado: ícone verde + "Conectado como: {account.phone_number}"
    - Desconectado: alerta amarelo + "WhatsApp desconectado. Vá em Configurações > Integrações para conectar."

**Visual**: Manter cards, dark mode, inputs de dias condicionais.

## Arquivos modificados
- Migration SQL (nova)
- `src/hooks/usePaymentGateway.tsx` — interface + defaults
- `src/components/admin/BillingAutomationSettings.tsx` — refatoração completa
- `src/integrations/supabase/types.ts` — atualizar tipos
