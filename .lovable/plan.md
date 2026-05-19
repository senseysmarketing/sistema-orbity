
# Refatoração WhatsApp — Envio, Cadência, Chat e Cobrança

Objetivo: tornar `whatsapp-send` o único caminho de saída de mensagens; alinhar tudo à Uazapi v2 (`/send/text`) e ao schema atual (`whatsapp_accounts.api_key`). Sem mexer no fluxo de conexão (`whatsapp-connect`, `useWhatsAppConnection`, `WhatsAppInstanceCard`), exceto para reaproveitar helpers compartilhados.

## 1. Migração de banco

Adicionar colunas (idempotente, `IF NOT EXISTS`) em:

`whatsapp_messages`:
- `source text default 'unknown'`
- `metadata jsonb default '{}'::jsonb`
- `remote_jid text`
- `provider_payload jsonb`
- `sent_at timestamptz`
- `delivered_at timestamptz`
- `read_at timestamptz`
- `failed_at timestamptz`
- `error_message text`
- Índice único `(account_id, message_id)` para upsert idempotente do webhook.

`whatsapp_conversations`:
- `context text default 'lead'` (valores: lead, client, billing, system)
- `client_id uuid` (nullable, FK para `clients`)
- `last_message_preview text`

Sem alterar RLS existente; políticas atuais (por agência via `account_id`) já cobrem.

## 2. Camadas compartilhadas (Edge)

### `supabase/functions/_shared/uazapi.ts` (estende o existente)
Adiciona ao módulo já criado para conexão:
- `sendText(account, { number, text }) → { messageId, remoteJid, raw }` — chama `POST {api_url}/send/text` com header `token: account.api_key`, payload `{ number, text }`.
- `findMessages(account, params)` — para sync (`POST /message/find`).
- `parseSendResponse(raw)` — extrai `messageId`, `remoteJid`, `status` do retorno Uazapi v2.
- `parseMessageStatus(event)` — normaliza `delivered|read|failed|sent`.

### `supabase/functions/_shared/whatsapp.ts` (novo)
- `normalizePhone(raw): string` — somente dígitos, ajusta DDI 55.
- `phoneVariants(raw): string[]` — variantes BR com/sem 9º dígito (substitui a duplicação atual em `whatsapp-webhook` e `process-whatsapp-queue`; reutiliza `_shared/phone.ts` se houver).
- `resolveConversation(supabase, { account, phone, leadId?, clientId?, context })` — busca por `(account_id, phone_variants)`; se não existir, faz `upsert` com `context`, `lead_id`, `client_id`.
- `extractMessageContent(uazapiMessage)` — texto unificado de `conversation`, `extendedTextMessage.text`, `imageMessage.caption` etc.
- `formatTemplateVariables(template, vars)` — substitui `{{nome}}`, `{{valor}}`, `{{vencimento}}` (centralizado para billing/automação).

## 3. `whatsapp-send` (reescrita)

Entrada (validada com zod):
```
{ account_id, agency_id?, phone_number, message,
  conversation_id?, lead_id?, client_id?, payment_id?,
  source: 'manual_crm'|'automation'|'billing'|'system',
  metadata?: object }
```

Fluxo:
1. Auth JWT do chamador (preview do user) ou `WHATSAPP_INTERNAL_SECRET` para chamadas server-to-server (queue/billing).
2. Carregar `whatsapp_accounts` por `account_id` (ou primeira `connected` da `agency_id`); validar `status='connected'` e `api_key`.
3. Se `account.allowed_sources` definido, validar `source` está incluído (purpose-based routing já existente).
4. `phone = normalizePhone(phone_number)`.
5. `sendText(account, { number: phone, text: message })` via shared.
6. `conversation = resolveConversation(...)` com `lead_id`/`client_id` quando vierem.
7. `INSERT whatsapp_messages` com `is_from_me=true`, `source`, `metadata`, `remote_jid`, `provider_payload=raw`, `status='sent'`, `sent_at=now()`, `message_id` do provider.
8. `UPDATE whatsapp_conversations` → `last_message_at=now()`, `last_message_is_from_me=true`, `last_message_preview=substring(message,0,120)`.
9. Resposta: `{ success, conversation_id, message_id, status, provider: { messageId, remoteJid } }` (sem token, sem payload sensível).

Erros: 4xx com `code` (`account_not_connected`, `invalid_phone`, `provider_failed`) e log em `whatsapp_automation_logs` quando `source!='manual_crm'`.

## 4. `process-whatsapp-queue` (refatorada)

- Mantém scheduling/horário permitido/retries/rate limit.
- Filtra `whatsapp_accounts.status='connected'` e `allowed_sources` contém `'automation'`.
- Remove chamadas diretas à Uazapi; passa a invocar `whatsapp-send` (via `supabase.functions.invoke` com `WHATSAPP_INTERNAL_SECRET`) com:
  ```
  { account_id, phone_number, message,
    lead_id, conversation_id, source:'automation',
    metadata:{ automation_id, step_position, phase } }
  ```
- Usa `phoneVariants` do shared para casar lead/conversa.
- Mantém transições de status `active→processing→active|finished` e validação por trigger existente.

## 5. `whatsapp-webhook` (refatorada)

- Mantém short-circuit `fromMe===true`.
- Parser dedicado por evento Uazapi v2:
  - `connection`: atualiza `whatsapp_accounts.status` + `phone_number`.
  - `messages` (recebida): `upsert` em `whatsapp_messages` por `(account_id, message_id)` com `is_from_me=false`, `remote_jid`, `provider_payload`, `source='inbound'`; atualiza conversa (`last_message_at`, `last_customer_message_at`, `last_message_is_from_me=false`, `last_message_preview`).
  - `messages_update` (ack do provider): atualiza `status` e `delivered_at|read_at|failed_at|error_message` da mensagem outbound por `message_id`.
- Quando inbound: chama lógica existente de `promoteLeadOnReply` + pausa `whatsapp_automation_control` ativa (`status='responded'`).
- Usa `resolveConversation` compartilhado.

## 6. Frontend: chat e hooks

Quebrar `useWhatsApp.tsx` em:
- `useWhatsAppConnection` (já existe — não tocar).
- `useWhatsAppChat(leadId)`:
  - busca `account` connected (reusa cache do connection hook).
  - resolve `conversation` por lead.
  - lista mensagens (paginadas).
  - `sendMessage` → invoca `whatsapp-send` com `source:'manual_crm'`, `lead_id`, `conversation_id`.
  - subscreve realtime em `whatsapp_messages` filtrado por `conversation_id`.
  - expõe `syncMessages` (chama `whatsapp-sync-messages`).
- `useWhatsAppAutomation(leadId)`:
  - hooks atuais de `startAutomation`/`toggleAutomation`/`useLeadAutomation`.

`WhatsAppChat.tsx` passa a consumir os 3 hooks separados. UI praticamente igual; remove o `useRef(hasSynced)` em favor de `useQuery` com `enabled` e `staleTime`.

## 7. `process-billing-reminders` (refatorada)

- Mantém seleção de pagamentos vencendo/atrasados, templates, anti-duplicação (`billing_message_logs`, `notification_tracking`).
- Mantém escolha da `account` (purpose `billing` quando houver, fallback `general`).
- Troca envio direto por `whatsapp-send`:
  ```
  { account_id, phone_number, message: rendered,
    client_id, payment_id, source:'billing',
    metadata:{ message_type:'reminder|overdue|due_today',
               gateway, due_date, amount } }
  ```
- Conversa será criada com `context='billing'` e `client_id`.

## 8. Segurança / segredos

- Reutiliza `UAZAPI_SERVER_URL` apenas como fallback; preferir `account.api_url`.
- Novo secret opcional `WHATSAPP_INTERNAL_SECRET` para autenticar chamadas server-to-server à `whatsapp-send` (queue/billing). Pedir ao usuário se ainda não existir.
- Nunca logar `api_key`, `provider_payload` integral em logs públicos; armazenar payload em DB sob RLS já existente.

## 9. Ordem de execução

1. Migração (colunas + índice).
2. Shared `uazapi.ts` (sendText/find) + novo `whatsapp.ts`.
3. Reescrever `whatsapp-send`.
4. Refator `whatsapp-webhook`.
5. Refator `process-whatsapp-queue`.
6. Refator `process-billing-reminders`.
7. Split de hooks + `WhatsAppChat`.
8. QA manual nos 4 critérios de sucesso.

## Critérios de aceite (resumo)

- Fase 1: envio manual no modal do lead chega no WhatsApp, aparece imediato no chat, cria/atualiza conversa e mensagem, atualiza `last_message_at`.
- Fase 2: resposta do lead é gravada via webhook (upsert), chat atualiza por realtime, automação ativa vai para `responded`, `last_customer_message_at` é preenchido.
- Fase 3: cadência envia respeitando delays/janela/retry e para ao receber resposta.
- Fase 4: régua de cobrança envia pela instância correta, registra log e não duplica no mesmo dia.

## Fora de escopo

- `whatsapp-connect` e UI de conexão.
- Mudanças no CRM além do chat do lead.
- Envio de mídia (texto apenas nesta fase).
