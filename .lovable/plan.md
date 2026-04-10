

# Edge Function: payment-webhook — Plano Corrigido

## Resumo
Webhook multi-tenant que recebe eventos do Asaas/Conexa, valida tokens por agência, atualiza pagamentos com idempotência, e enfileira notificações na `notification_queue`.

## Descobertas
- `notification_queue` **não existe** no banco. Precisa ser criada via migration.
- `client_payments` já possui: `asaas_payment_id`, `conexa_charge_id`, `status`, `amount_paid`, `gateway_fee`, `paid_date`, `agency_id`.
- `agency_payment_settings` **não** possui colunas de webhook token — precisam ser adicionadas.

## Alterações

### 1. Migration SQL (2 alterações)

**a) Novas colunas de token em `agency_payment_settings`:**
```sql
ALTER TABLE public.agency_payment_settings
  ADD COLUMN IF NOT EXISTS asaas_webhook_token TEXT,
  ADD COLUMN IF NOT EXISTS conexa_webhook_token TEXT;
```

**b) Nova tabela `notification_queue`:**
```sql
CREATE TABLE public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
```
RLS: policy para service_role apenas (backend-only table).

### 2. Edge Function: `supabase/functions/payment-webhook/index.ts`

**URL format:**
```
POST /payment-webhook?gateway=asaas&agency_id=<UUID>
POST /payment-webhook?gateway=conexa&agency_id=<UUID>
```

**Fluxo completo (sem early return antes do processamento):**

1. Ler `gateway` e `agency_id` da query string. Se ausentes, retornar 400.
2. Buscar `agency_payment_settings` por `agency_id` usando Service Role Key.
3. Validar header `asaas-access-token` contra `asaas_webhook_token` do banco (ou equivalente Conexa). Se inválido, retornar 401.
4. Parsear evento do payload:
   - Asaas: `event` + `payment.id` + `payment.value` + `payment.netValue`
   - Conexa: formato equivalente
5. **Idempotência**: SELECT status atual do pagamento por `asaas_payment_id`. Se evento é `PAYMENT_RECEIVED` e status já é `paid`, retornar 200 silencioso ("Already processed").
6. UPDATE `client_payments` conforme evento:
   - `PAYMENT_RECEIVED` → status='paid', amount_paid=netValue, gateway_fee=value-netValue, paid_date=now()
   - `PAYMENT_OVERDUE` → status='overdue'
   - `PAYMENT_DELETED` → status='cancelled'
7. Se `PAYMENT_RECEIVED`: INSERT em `notification_queue` com channel='in_app', payload com dados do recebimento, user_id do owner da agência (via `agency_users` role='owner').
8. Retornar `new Response("OK", { status: 200 })` **somente no final** do try. Catch retorna 200 com log do erro (para não causar retry do gateway).

### 3. Config (`supabase/config.toml`)
```toml
[functions.payment-webhook]
verify_jwt = false
```

### 4. Atualizar `usePaymentGateway.tsx`
Adicionar `asaas_webhook_token` e `conexa_webhook_token` à interface `PaymentSettings` e ao `defaultSettings`.

## Mapeamento de eventos

```text
Asaas Event          | Conexa Event       | DB Status
---------------------|--------------------|----------
PAYMENT_RECEIVED     | charge.paid        | paid
PAYMENT_OVERDUE      | charge.overdue     | overdue
PAYMENT_DELETED      | charge.cancelled   | cancelled
```

## Arquivos
- Migration SQL (nova — tokens + notification_queue)
- `supabase/functions/payment-webhook/index.ts` (novo)
- `supabase/config.toml` (adicionar entry)
- `src/hooks/usePaymentGateway.tsx` (adicionar campos de token)
- `src/integrations/supabase/types.ts` (atualizar tipos)

## Pós-deploy
Cada agência deverá:
1. Gerar um token no painel do Asaas e salvar em "Configurações > Faturamento" no Orbity (campo `asaas_webhook_token`)
2. Configurar a URL do webhook no Asaas: `https://ovookkywclrqfmtumelw.supabase.co/functions/v1/payment-webhook?gateway=asaas&agency_id=<SEU_UUID>`

