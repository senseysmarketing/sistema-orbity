## Objetivo

Replicar a arquitetura de espelhamento WhatsApp/Uazapi já validada no outro sistema. Hoje o webhook descarta TODO `fromMe`, então mensagens manuais enviadas pelo celular (e até mensagens da própria API que retornam pelo webhook) não chegam ao Orbity. Também o sync manual não é idempotente o suficiente nem reaproveita a mesma lógica do webhook.

## Mudanças principais

### 1. Marcar mensagens enviadas pela API (`whatsapp-send`)

- Ao gravar `whatsapp_messages` no envio, incluir `metadata.was_sent_by_api = true` (além do `source` já existente).
- Isso permite que o webhook diferencie "echo da minha própria API" vs "mensagem manual enviada pelo celular".

### 2. Webhook: parar de ignorar `fromMe`

Em `supabase/functions/whatsapp-webhook/index.ts`, no bloco `messages/messages.upsert`:

- Remover o early-return `if (fromMe)`.
- Para `fromMe = true`:
  - `wasSentByApi` = `true` se já existe `whatsapp_messages` com mesmo `account_id + message_id` E `metadata.was_sent_by_api = true` (ou se o `messageId` bate com um envio recente). Nesse caso, apenas atualizar status/ack e sair (não duplicar, não pausar automação, não mover lead).
  - Caso contrário, tratar como **outbound manual** (enviado pelo WhatsApp real do usuário):
    - Resolver conversation via `resolveLeadConversation`.
    - `upsert` em `whatsapp_messages` com `is_from_me = true`, `source = 'manual_whatsapp'`, `status = 'sent'`, `metadata.was_sent_by_api = false`.
    - Atualizar `last_message_at`, `last_message_is_from_me = true`, `last_message_preview`.
    - **Não** pausar automação e **não** mover lead (a regra do PRD diz que só inbound pausa/promove).
- Para `fromMe = false` (inbound): manter fluxo atual (dedup, pausa automação, promove lead se toggle ativo).

### 3. Dedup robusta

- Já existe unique `account_id, message_id` em `whatsapp_messages` — manter `upsert({ onConflict: 'account_id,message_id' })` em todos os caminhos (send, webhook inbound, webhook outbound-manual, sync, queue).
- Adicionar índice em `metadata->>'was_sent_by_api'` não é necessário; basta consultar pelo `message_id` retornado pelo provider no momento do envio.

### 4. Sync (`whatsapp-sync-messages`)

Alinhar com webhook:

- Para cada mensagem retornada pelo `/message/find`, derivar `is_from_me` e gravar com `source = isFromMe ? 'manual_whatsapp' : 'inbound'` (sem sobrescrever mensagens já gravadas pela API: o `upsert` por `message_id` cuida disso).
- Preencher `provider_payload` com o objeto cru para auditoria.
- Manter o trecho de pause-automation só para mensagens inbound mais recentes que o último followup (já está correto).
- Detectar áudio/imagem/vídeo/documento e gravar `message_type` corretamente (já está parcialmente — adicionar fallback igual ao `extractMessageContent` do webhook para uniformizar).

### 5. Persistir `lead_id` direto em `whatsapp_messages`

Para facilitar o realtime e queries do modal:

- Adicionar coluna `lead_id uuid` em `whatsapp_messages` (nullable, indexada).
- Backfill: `UPDATE whatsapp_messages m SET lead_id = c.lead_id FROM whatsapp_conversations c WHERE m.conversation_id = c.id AND m.lead_id IS NULL`.
- Trigger `BEFORE INSERT OR UPDATE OF conversation_id` que copia `lead_id` da conversation. Mantém invariante automática mesmo após merge.
- `webhook`, `send`, `queue`, `sync` passam a setar `lead_id` explicitamente quando conhecido.

### 6. Carregamento do modal por `lead_id`

Em `useWhatsApp.useConversationMessages` (hook usado por `WhatsAppChat`), trocar o filtro de `conversation_id` por `OR(conversation_id.eq.X, lead_id.eq.Y)`. Isso garante que mesmo mensagens órfãs (sem conversation_id resolvido ainda) apareçam assim que o `lead_id` for setado pelo webhook.

- Realtime subscription: filtrar por `lead_id=eq.{leadId}` (mais robusto que `conversation_id` que pode mudar após merge).

### 7. Configuração do webhook Uazapi

- Atualizar `whatsapp-connect` / setup da instância: enviar `excludeMessages` SEM `fromMeYes`. Manter apenas filtros para `groups`/`broadcast`/`newsletter` se aplicável.
- Documentar no `WhatsAppInstanceCard` que mensagens manuais agora espelham no CRM.

## Critérios de aceite

- Mensagem manual enviada pelo celular para o lead Doraci aparece no modal em até alguns segundos.
- Mensagens inbound continuam aparecendo e pausando automação.
- Mensagens enviadas pela própria API (`whatsapp-send`) não geram duplicata quando o webhook entrega o echo `fromMe`.
- Sync manual ao abrir modal traz histórico antigo (inbound + outbound manuais) sem duplicar.
- Modal usa `lead_id` como fonte primária; merge de conversas não "perde" mensagens.

## Arquivos afetados

- `supabase/functions/whatsapp-webhook/index.ts` — não ignorar `fromMe`; tratar outbound manual.
- `supabase/functions/whatsapp-send/index.ts` — gravar `metadata.was_sent_by_api = true`.
- `supabase/functions/whatsapp-sync-messages/index.ts` — uniformizar com webhook, popular `lead_id`.
- `supabase/functions/process-whatsapp-queue/index.ts` — `metadata.was_sent_by_api = true` nas mensagens automatizadas.
- `supabase/functions/whatsapp-connect/index.ts` — remover `fromMeYes` do `excludeMessages`.
- Migração: coluna `whatsapp_messages.lead_id` + índice + trigger de sync + backfill.
- `src/hooks/useWhatsApp.tsx` — query/realtime do modal por `lead_id`.
- `src/components/crm/WhatsAppChat.tsx` — passar `leadId` ao hook (já passa).

## Riscos / observações

- Backfill em `whatsapp_messages` pode ser grande; rodar em lote `.range(0,4999)` se necessário (rule do projeto).
- Existem mensagens antigas com `source='manual_crm'` que continuarão sem `was_sent_by_api`; o dedup por `message_id` ainda funciona, então não há regressão.
- Após deploy, validar com lead Doraci e Igor por curl ao webhook + abrir modal.
