
## Causa raiz

O `payment-webhook` da Conexa sempre retorna `200 OK` (boa prática para evitar retries), mas tem duas portas silenciosas que explicam todo o sintoma:

- **Parser rígido:** só identifica quitação se `body.paidAmount && body.paymentDate` estiverem presentes. Qualquer variação de nome de campo (snake_case, aninhado, alias em PT) cai no `else` e responde "OK" sem aplicar nada.
- **Lookup rígido:** só procura por `body.chargeId || body.id` em `client_payments.conexa_charge_id`. Se a Conexa enviar `cobrancaId`, `numeroCobranca` ou um wrapper aninhado, o `console.warn("Payment not found")` engole e responde "OK".

Em ambos os casos a Conexa marca "Executada com sucesso" no relatório de webhooks (porque recebeu 2xx), mas o Orbity nunca atualiza `status='paid'` → a régua continua disparando.

Os logs de edge function da Supabase têm retenção curta (~1h) e não podem confirmar qual variação está chegando, então a solução precisa **registrar permanentemente** os payloads e **tolerar múltiplas formas**.

## Solução (100% automática, sem botão manual)

### 1. Tabela de auditoria `conexa_webhook_log`

Migração criando tabela com `id`, `agency_id`, `received_at`, `raw_body jsonb`, `headers jsonb`, `parsed_charge_id`, `parsed_event`, `match_status` (`matched_and_updated` / `already_processed` / `payment_not_found` / `unknown_event` / `invalid_payload`), `payment_id`, `error_message`. RLS: só master admin e owner da agência leem. Retenção: índice em `received_at`; cleanup por pg_cron mantém últimos 30 dias.

Justificativa: sem isso a gente fica cego de novo na próxima vez. Vira fonte da verdade para auditar quitações.

### 2. Refatorar `payment-webhook` (apenas a branch Conexa)

- **Sempre persistir** o `raw_body` em `conexa_webhook_log` antes de qualquer parsing, mesmo em erro/401.
- **Parser tolerante** — extrair `chargeId` de:
  - `body.chargeId`, `body.id`, `body.charge?.id`, `body.charge?.chargeId`
  - `body.cobrancaId`, `body.numeroCobranca`, `body.codigoCobranca`
  - `body.cobranca?.id`, `body.data?.chargeId`, `body.data?.id`
  - Sempre normalizar para `String(...)`
- **Parser tolerante** — detectar quitação se QUALQUER dessas combinações existir:
  - `paidAmount` + (`paymentDate` || `paymentOperationDate` || `dataPagamento` || `dataQuitacao`)
  - `valorPago` + qualquer campo de data acima
  - `status` ∈ {`paid`, `quitado`, `quitada`, `liquidado`, `settled`} com valor monetário em `amount`/`valor`/`value`
- **Parser tolerante** — detectar cancelamento se `status` ∈ {`cancelled`, `canceled`, `cancelado`, `excluido`, `excluded`, `deleted`}.
- **Update** continua igual ao atual (mantém `amount_paid`, `paid_at`, `paid_date`, `gateway_fee`).
- Ao final, gravar `match_status` + `payment_id` no log de auditoria.
- Continua retornando 200 sempre (não muda o protocolo com a Conexa).

### 3. Cron de reconciliação `reconcile-conexa-payments` (rede de segurança)

Nova edge function, sem JWT, agendada via `pg_cron` a cada 30 min:

- Para cada `agency_payment_settings` com `conexa_enabled=true`:
  - SELECT `client_payments` WHERE `billing_type='conexa'` AND `status='pending'` AND `conexa_charge_id IS NOT NULL` AND `due_date >= today - 60 days` AND `due_date <= today + 7 days` (janela útil, ordenado por `due_date asc`, limit 200).
  - Para cada uma, `GET {baseUrl}/charge/{conexa_charge_id}` com o `conexa_api_key` da agência.
  - Se retorno indicar pago, aplica o mesmo update do webhook (função compartilhada `applyConexaPaymentUpdate` extraída para `_shared/`).
  - Registra resultado em `conexa_webhook_log` com `match_status='reconciled_by_cron'`.

Garante que mesmo se o webhook continuar falhando por outro motivo no futuro, em no máximo 30 min as faturas pagas são reconciliadas — antes da próxima janela diária da régua (09:00 BRT).

### 4. Migração pg_cron

`select cron.schedule('reconcile-conexa-payments', '*/30 * * * *', ...)` chamando a edge via `net.http_post` (executar via tool de insert, não migração — contém anon key).

### 5. Recuperação imediata das 12 faturas atuais

Após deploy, eu invoco manualmente o cron uma vez pra resolver Dream Hunters, One Consultoria, Rodrigo Lima, Matriz, Reference Home, EOS etc. Sem UI envolvida — só uma chamada de validação pós-deploy.

## O que NÃO vou fazer

- Sem botão "Sincronizar" na UI (rejeitado).
- Sem mexer em `process-billing-reminders` (uma vez que o status vire `paid`, ele já respeita).
- Sem mexer em Asaas / Stripe (cobertura desta entrega = só Conexa).
- Sem alterar o `agency_payment_settings` ou config do painel Conexa (já está OK).

## Arquivos

- Migração: `conexa_webhook_log` + RLS + cleanup pg_cron + `reconcile-conexa-payments` pg_cron
- `supabase/functions/_shared/conexa-payment-update.ts` (novo, helper compartilhado)
- `supabase/functions/payment-webhook/index.ts` (refatorar branch Conexa)
- `supabase/functions/reconcile-conexa-payments/index.ts` (nova edge)
- `mem://finance/billing/conexa-webhook-resilience` (nova memória documentando o parser tolerante e a rede de segurança)
