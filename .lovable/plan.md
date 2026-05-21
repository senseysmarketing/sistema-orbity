# Refatoração — Espelhamento WhatsApp + Automações Dependentes

## Objetivo

Criar uma única camada confiável de resolução de conversa (`account_id + lead_id + telefone + remoteJid`) e fazer com que webhook, envio manual, queue de cadência, sync e o modal do lead usem essa mesma camada. Em cima disso, corrigir as 4 automações: pausa por resposta, escudo anti-bot, mover para "Em Contato" e mover para "Perdido" após 24h.

## Fase 1 — Resolvedor único (shared)

Criar `supabase/functions/_shared/whatsapp-conversation.ts` exportando:

```ts
resolveLeadConversation({
  accountId, agencyId, leadId?, phone?, remoteJid?, context
}) => { conversation_id, lead_id, phone_number, remote_jid, created, linked }
```

Ordem de resolução:
1. Normaliza telefone via `_shared/phone.ts` (DDI 55 + nono dígito).
2. Busca por `account_id + lead_id` (se vier).
3. Busca por `account_id + remote_jid`.
4. Busca por `account_id + phone_number IN variantes`.
5. Se conversa achada estiver órfã (`lead_id IS NULL`) e tivermos `leadId` ou `find_lead_by_normalized_phone` retornar lead → faz `UPDATE lead_id`.
6. Se houver duplicatas, escolhe a mais recente com mensagens (subquery `EXISTS whatsapp_messages`) e marca as outras como `merged_into` (campo novo opcional) — sem deletar.
7. Se não achou nada, faz `INSERT` com `remote_jid`, `phone_number`, `lead_id`, `context`.

Manter o `resolveConversation` antigo como wrapper retrocompatível.

## Fase 2 — Edge Function `resolve-whatsapp-conversation`

Nova função `supabase/functions/resolve-whatsapp-conversation/index.ts`:
- Valida JWT + agência via `_shared/auth.ts` (`assertAgencyAccess`).
- Body: `{ account_id, lead_id, phone_number? }`.
- Busca account/lead, chama `resolveLeadConversation`.
- Retorna `{ conversation_id, lead_id, phone_number, remote_jid }`.

## Fase 3 — Refatorar `useWhatsApp` + `WhatsAppChat`

`src/hooks/useWhatsApp.tsx`:
- Substituir `useLeadConversation` por chamada a `supabase.functions.invoke('resolve-whatsapp-conversation', …)`. Remover toda a lógica de variantes de telefone do React.
- `useConversationMessages`: adicionar listener Realtime para `UPDATE` (além do `INSERT` atual) — para refletir ack/status.
- `syncMessages`: garantir que envia `conversation_id`.
- Renomear comentários "Evolution API" → "Uazapi".

`src/components/crm/WhatsAppChat.tsx`:
- Sem mudança de UX. Apenas consumir o novo hook.
- Garantir badge "Cliente respondeu" quando `automation.status === 'responded'`.

## Fase 4 — Fortalecer `whatsapp-webhook`

`supabase/functions/whatsapp-webhook/index.ts`:
- Usar `resolveLeadConversation` no lugar de `resolveConversation`.
- Filtros já existentes (grupos, status, newsletter, fromMe) — manter e centralizar em helpers.
- Sempre atualizar `last_message_preview`, `last_customer_message_at`, `last_message_is_from_me=false`, `remote_jid`.
- Pausar automações: `UPDATE whatsapp_automation_control SET status='responded', conversation_state='customer_replied'` por `lead_id` ou `conversation_id`.
- Promoção para "Em Contato": respeitar `agencies.whatsapp_auto_contact` (já existe `promoteLeadOnReply`, condicionar ao toggle).
- Cada decisão gera 1 linha em `whatsapp_webhook_logs` (ver Fase 5).

## Fase 5 — Migration: tabela de logs + ajuste lead_history

Migration SQL:

```sql
-- 1) lead_history.user_id nullable (eventos automáticos)
alter table public.lead_history alter column user_id drop not null;

-- 2) Logs de webhook
create table public.whatsapp_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid,
  agency_id uuid,
  lead_id uuid,
  conversation_id uuid,
  event text not null,
  message_id text,
  remote_jid text,
  phone_number text,
  from_me boolean,
  resolved_lead boolean,
  resolved_conversation boolean,
  action_taken text,        -- message_received | message_ignored_* | conversation_created | conversation_linked_to_lead | automation_paused_customer_replied | lead_moved_to_contact | message_update_received | webhook_error
  error_message text,
  payload_keys text[],
  created_at timestamptz not null default now()
);
create index on public.whatsapp_webhook_logs (agency_id, created_at desc);
create index on public.whatsapp_webhook_logs (lead_id, created_at desc);

alter table public.whatsapp_webhook_logs enable row level security;
create policy "agency members read webhook logs"
  on public.whatsapp_webhook_logs for select
  using (user_belongs_to_agency(agency_id));
-- INSERT só via service role (sem policy de insert).
```

Sem armazenar token nem payload completo (exceto `error_message` em caso controlado).

## Fase 6 — Anti-bot + queue (`process-whatsapp-queue`)

Em `supabase/functions/process-whatsapp-queue/index.ts`:
- Filtrar `whatsapp_accounts.status = 'connected'` (remover `connecting`).
- Antes de enviar cada follow-up, **dupla checagem**:
  - `conversation.last_customer_message_at > max(last_followup_sent_at, started_at)` → marcar `responded` e abortar.
  - `SELECT 1 FROM whatsapp_messages WHERE conversation_id=… AND is_from_me=false AND created_at > <último envio nosso>` → idem.
  - Status atual da automação ∈ {`responded`,`paused`,`finished`} → abortar.
  - Mensagem manual (`source='manual_crm'`) nos últimos N minutos → adiar (ou pular este tick).
- Usar resolvedor central quando precisar reconciliar.

## Fase 7 — `whatsapp-send`

- Após enviar, atualizar `whatsapp_automation_control.last_followup_sent_at` quando `source='cadence'`.
- Para `source='manual_crm'`, atualizar conversation timestamps mas **não** mexer em automation status.
- Usar resolvedor central.

## Fase 8 — Refatorar `whatsapp-sync-messages`

- Usar resolvedor central para obter `conversation_id`.
- Persistir `remote_jid`, atualizar `last_message_preview`.
- Se durante o sync surgirem inbounds mais recentes que `last_followup_sent_at` → aplicar a mesma regra do webhook (`responded` + `customer_replied` + promoção para "Em Contato" se toggle ativo).

## Fase 9 — Edge Function `process-whatsapp-ghosting`

Nova `supabase/functions/process-whatsapp-ghosting/index.ts` (cron 15-30 min via pg_cron — instrução separada):

Fluxo por agência com `whatsapp_auto_ghosting = true`:
- Buscar `whatsapp_automation_control` cujo `last_followup_sent_at < now() - 24h` e `status NOT IN ('finished','responded')`.
- Confirmar via `whatsapp_messages` que não há inbound posterior ao último envio nosso (defesa em profundidade contra `last_customer_message_at` desatualizado).
- Se lead.status não estiver em (`won`,`lost`):
  - `UPDATE leads SET status='lost', loss_reason='Ghosting no WhatsApp', status_changed_at=now()`.
  - `INSERT INTO lead_history (... user_id=NULL, action_type='auto_ghosting', ...)`.
- `UPDATE whatsapp_automation_control SET status='finished', conversation_state='moved_to_lost_ghosting'`.
- Log em `whatsapp_automation_logs` + `whatsapp_webhook_logs` (`action_taken='ghosting_moved_to_lost'`).

Observação: já existe `process-lead-ghosting`. Reuso parcial — esta nova é específica do gatilho de cadência. Vou consolidar a lógica nesta nova função e deprecar a antiga ao final (sem remover ainda).

## Fase 10 — `WhatsAppTemplateManager`

Apenas trocar referências/labels "Evolution API" → "Uazapi". Sem mudança funcional.

## Critérios de sucesso (validação)

1. Abrir modal de lead com conversa existente → conversa carrega via `resolve-whatsapp-conversation`.
2. Enviar mensagem pelo modal → aparece imediatamente (otimista + realtime).
3. Receber resposta no WhatsApp → aparece via realtime, automação vira `responded`, lead vai para "Em Contato" se toggle ativo.
4. Áudio → renderiza `[audio]`.
5. Cadência: não envia depois de resposta.
6. 24h sem resposta após último follow-up → lead vai para `lost` + motivo "Ghosting no WhatsApp".
7. Logs em `whatsapp_webhook_logs` explicam cada decisão.
8. Conversas órfãs/duplicadas convergem para uma única por `account_id + lead_id`.

## Ordem de execução (sem misturar)

1. Migration (logs + lead_history nullable) — `supabase--migration`.
2. Shared resolver + `resolve-whatsapp-conversation`.
3. Refatorar hook + chat.
4. Webhook + queue + send + sync.
5. `process-whatsapp-ghosting` + agendamento pg_cron.
6. Rename Evolution → Uazapi (cosmético).

Sem alterações fora desse escopo. Sem mexer no módulo PPR.
