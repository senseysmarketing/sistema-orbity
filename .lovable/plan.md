

# Fase 2 — Edge Function `process-billing-reminders`

## Resumo
Criar a Edge Function que roda diariamente via pg_cron, varre pagamentos pendentes, aplica templates multi-gateway e envia via WhatsApp com deduplicação.

## 1. Edge Function `supabase/functions/process-billing-reminders/index.ts`

### Fluxo
1. Calcular `TODAY` forçando timezone `America/Sao_Paulo`
2. Buscar todas as `agency_payment_settings` com `notify_via_whatsapp = true`
3. Para cada agência (try/catch isolado):
   - Buscar `whatsapp_accounts` com `status = 'connected'`
   - Se não há conta conectada, skip
   - Buscar `client_payments` com status `pending`, JOIN com `clients` onde `billing_automation_enabled = true` e `contact IS NOT NULL`
   - Classificar cada pagamento:
     - **Reminder**: `due_date = TODAY` (se `reminder_due_date_enabled`) OU `due_date = TODAY + reminder_before_days` (se `reminder_before_enabled`)
     - **Overdue**: `due_date = TODAY - reminder_overdue_days` (se `reminder_overdue_enabled`)
   - Resolver gateway: `payment.billing_type` → fallback `settings.active_gateway` → fallback `'manual'`
   - Verificar toggle `{gateway}_billing_enabled === true`
   - Selecionar template `{gateway}_template_reminder` ou `{gateway}_template_overdue`
   - Se template vazio, skip

4. Substituir variáveis (EXATAMENTE como na UI — `TEMPLATE_VARS`):
   - `{nome_cliente}` → `client.name`
   - `{valor}` → `payment.amount` formatado BRL (ex: `R$ 1.500,00`)
   - `{data_vencimento}` → `payment.due_date` formatado DD/MM/YYYY
   - `{link_pagamento}` → `payment.invoice_url` ou `payment.conexa_invoice_url` ou vazio

5. Deduplicação via `notification_tracking`:
   - `notification_type = 'billing_reminder:YYYY-MM-DD'` ou `'billing_overdue:YYYY-MM-DD'`
   - `entity_id = payment.id`
   - `user_id` = placeholder (usar agency owner ou um UUID fixo do sistema)
   - Se já existe registro para hoje, skip

6. Enviar via fetch para `whatsapp-send`:
   - URL: `${SUPABASE_URL}/functions/v1/whatsapp-send`
   - Header: `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
   - Body: `{ account_id, phone_number: client.contact, message }`

7. Rate limit: `await sleep(1000)` entre envios

### Guardrails
- **Timezone**: `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })` → `YYYY-MM-DD`
- **Auth**: Service role key no header do fetch interno
- **Isolamento**: try/catch por agência E por pagamento, com `console.error` detalhado
- **Variáveis**: Exatamente `{nome_cliente}`, `{valor}`, `{data_vencimento}`, `{link_pagamento}` (da UI)

## 2. Config

Adicionar em `supabase/config.toml`:
```toml
[functions.process-billing-reminders]
verify_jwt = false
```

## 3. pg_cron (via SQL insert, não migration)

```sql
SELECT cron.schedule(
  'process-billing-reminders-daily',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-billing-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);
```

## Arquivos
1. `supabase/functions/process-billing-reminders/index.ts` (novo)
2. `supabase/config.toml` (adicionar entry)
3. SQL insert para pg_cron (via supabase insert tool)

