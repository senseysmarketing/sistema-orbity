# Plano: Conversa única por lead no WhatsApp

## Objetivo
Garantir que cada lead tenha exatamente UMA conversa ativa por `account_id + context='lead'`, mesclando duplicatas existentes, travando no banco e refatorando todos os pontos que dependem de `conversation_id`.

## Fase 1 — Helper central e merge

**Arquivo:** `supabase/functions/_shared/whatsapp-conversation.ts` (evoluir)

Reescrever `resolveLeadConversation` com a ordem:
1. Buscar todas as conversas por `account_id + lead_id + context`.
2. Se >1: eleger principal (mais mensagens → maior `last_message_at` → mais recente) e mesclar restantes.
3. Se 0: buscar por `account_id + remote_jid`.
4. Se 0: buscar por `account_id + phone_number IN phoneVariants(phone)`.
5. Se conversa órfã (sem `lead_id`): backfill `lead_id`.
6. Se nada: criar nova.

Adicionar `mergeDuplicateConversations(primaryId, duplicateIds[])`:
- `UPDATE whatsapp_messages SET conversation_id=primary WHERE conversation_id=ANY(dup)`
- `UPDATE whatsapp_automation_control SET conversation_id=primary WHERE conversation_id=ANY(dup)`
- Consolidar `last_message_at`, `last_customer_message_at`, `last_message_preview`, `remote_jid` na principal (maior data).
- Deletar duplicatas.
- Logar em `whatsapp_conversation_resolution_logs`.

Normalização: `phone_number` sempre apenas dígitos (`5511...`), `remote_jid` separado, nunca com `+`.

## Fase 2 — Banco

Migração:
- Criar tabela `whatsapp_conversation_resolution_logs` (campos conforme spec) + RLS leitura por membros da agência.
- RPC `merge_whatsapp_conversations(primary uuid, duplicates uuid[])` SECURITY DEFINER para uso pelas edges.
- **Após** rodar o merge inicial via edge ou job, criar índice:
  ```sql
  CREATE UNIQUE INDEX whatsapp_conversations_unique_lead_context
    ON whatsapp_conversations(account_id, lead_id, context)
    WHERE lead_id IS NOT NULL AND context = 'lead';
  ```
- Job único de limpeza: para cada `(account_id, lead_id)` com duplicatas, chamar `merge`. Pode ser uma edge `cleanup-duplicate-conversations` rodada manualmente uma vez.

## Fase 3 — Edge `resolve-whatsapp-conversation`

Já existe — ajustar para:
- Aceitar `{ account_id, lead_id, phone_number }`.
- Validar auth + agency access (já faz).
- Chamar `resolveLeadConversation` (nova versão, que mescla).
- Retornar `{ success, conversation_id, conversation, merged_or_linked }`.

## Fase 4 — Refatorar edges consumidoras

- **`whatsapp-send`**: substituir resolução atual por nova `resolveLeadConversation`; ignorar `conversation_id` enviado pelo frontend se diferir do principal; atualizar `last_message_at/preview` na principal.
- **`whatsapp-webhook`**: para inbound, extrair `remote_jid`, normalizar telefone, achar lead, chamar resolver, salvar mensagem na principal, atualizar `last_customer_message_at`, pausar `whatsapp_automation_control` ativo, mover lead para "Contato" se `whatsapp_auto_contact=true`.
- **`process-whatsapp-queue`**: resolver conversa antes de enviar; se `automation_control.conversation_id` aponta para duplicata, atualizar; checar mensagem inbound após `last_followup_sent_at`; se houver, marcar `status='responded'` e abortar. Remover suporte a `account.status='connecting'` — só enviar com `connected`.
- **`whatsapp-sync-messages`**: usar resolver para destinar mensagens sincronizadas à conversa principal.

## Fase 5 — Frontend

- **`useWhatsApp.useLeadConversation`**: já chama a edge `resolve-whatsapp-conversation`. Garantir que NÃO existe fallback `.maybeSingle()` por `account_id+lead_id`. Confirmar que retorna apenas o `conversation_id` da edge.
- **`WhatsAppChat.tsx`**: ao abrir aba, chamar resolver → receber `conversation_id` único → buscar mensagens → subscribe realtime (`INSERT`/`UPDATE` em `whatsapp_messages` filtrado por `conversation_id`).
- Remover qualquer "cura" de conversa client-side.

## Fase 6 — Logs

Toda chamada de `resolveLeadConversation` registra evento em `whatsapp_conversation_resolution_logs` com `action` apropriado (`conversation_created`, `resolved_by_lead`, `resolved_by_phone`, `resolved_by_remote_jid`, `duplicate_conversation_merged`, `automation_relinked`, `resolution_error`).

## Critério de aceite
- Doraci: ao abrir modal, conversa principal `27d97aa6-…` é retornada; mensagem 10:18 aparece; conversa vazia some; `automation_control` aponta para principal.
- Nenhum `(account_id, lead_id, context='lead')` com >1 linha em `whatsapp_conversations` (garantido pelo índice).
- Mensagem enviada pelo CRM/automação aparece no modal em tempo real.
- Resposta inbound: pausa automação + move para Contato (se toggle) + reflete no modal.
- Ghosting 24h usa `last_customer_message_at` da principal.

## Detalhes técnicos

```text
Resolver (server)
 ├─ por lead_id ──► N conversas? ──► elege + merge ──► principal
 │                  1 conversa  ──────────────────────► principal
 │                  0 conversas ──┐
 ├─ por remote_jid ◄──────────────┤
 ├─ por phone variants ◄──────────┤
 └─ cria nova ◄───────────────────┘
```

Ordem de deploy:
1. Migração (tabela logs + RPC merge).
2. Helper + edges (`resolve`, `send`, `webhook`, `queue`, `sync`).
3. Rodar limpeza manual de duplicatas existentes (via edge one-shot).
4. Aplicar índice único.
5. Refatorar frontend.

## Fora de escopo
- UI nova (mantém modal atual).
- Mudança no schema de `whatsapp_messages`.
- Reescrita do fluxo de ghosting (já implementado).
