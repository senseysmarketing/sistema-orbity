

# Auditoria Completa do Sistema de Automação WhatsApp ORBITY

## Resultado da Auditoria

```text
ORBITY SYSTEM CHECK - RELATÓRIO DE AUDITORIA
=============================================

1. Estrutura de Conversas .......... ⚠️  GAPS DETECTADOS
2. State Machine ................... ❌  NÃO IMPLEMENTADA
3. Fila de Mensagens ............... ⚠️  PARCIAL
4. Sistema de Delays ............... ⚠️  SIMPLIFICADO
5. Webhook (Recebimento) ........... ✅  OK
6. Controle de Duplicidade ......... ✅  OK
7. Rate Limit ...................... ❌  NÃO IMPLEMENTADO
8. Retries ......................... ❌  NÃO IMPLEMENTADO
9. Fluxos de Automação ............. ⚠️  LINEAR APENAS
10. Interrupção Humana ............. ✅  OK (via webhook)
11. Histórico de Conversa .......... ✅  OK
12. Logs do Sistema ................ ⚠️  PARCIAL
=============================================
Status final: ERROS DETECTADOS — melhorias necessárias
```

---

## Detalhamento por Item

### 1. Estrutura de Conversas — ⚠️ GAPS

**O que existe:**
- `whatsapp_conversations`: possui `id`, `account_id`, `phone_number`, `lead_id`, `last_message_at`, `last_customer_message_at`, `created_at`
- FK para `leads` com `ON DELETE SET NULL`
- Index em `phone_number` e `lead_id`

**Gaps encontrados:**
- **Sem campo `current_state`** — Não existe enum de estado de conversa (NEW, FLOW_ACTIVE, WAITING_RESPONSE, etc.). O estado é controlado apenas via `whatsapp_automation_control.conversation_state` como string livre sem validação.
- **Sem validação de formato de telefone** — aceita qualquer string
- **Sem unique constraint** em `(account_id, phone_number)` — risco de conversas duplicadas para o mesmo número

**Correções necessárias:**
1. Adicionar unique constraint `(account_id, phone_number)` em `whatsapp_conversations`
2. Considerar enum para `conversation_state` em `whatsapp_automation_control`

### 2. State Machine — ❌ NÃO IMPLEMENTADA

**Situação atual:** Não existe máquina de estados formal. O campo `conversation_state` aceita qualquer string e as transições são feitas diretamente sem validação. Estados encontrados no código:
- `new_lead`, `waiting_reply`, `customer_replied`, `greeting_1_sent`, `followup_X_sent`, `closed_no_reply`, `automation_finished`, `source_not_allowed`

**Riscos:**
- Transições inválidas podem ocorrer (ex: `finished` → `active`)
- Sem trigger de validação no banco
- O campo `status` em `whatsapp_automation_control` (active/processing/paused/responded/finished) funciona como pseudo-state-machine mas sem enforcement

**Correção necessária:**
1. Criar trigger de validação que impede transições inválidas
2. Ou ao menos criar CHECK constraint com valores permitidos para `status`

### 3. Fila de Mensagens — ⚠️ PARCIAL

**O que existe:**
- `whatsapp_messages` com: `message_id`, `conversation_id`, `message_type`, `content`, `status`, `created_at`
- Unique constraint `(account_id, message_id)` — garante idempotência
- Status usados: `sent`, `received`, `delivered`

**Gaps:**
- **Sem status PENDING/SCHEDULED/FAILED/CANCELLED** — mensagens são enviadas síncronamente, não há fila real
- **Sem campo `retry_count`** — sem controle de reenvio
- **Sem campo `scheduled_at`** — delays são controlados via `automation_control.next_execution_at`, não na mensagem

### 4. Sistema de Delays — ⚠️ SIMPLIFICADO

**O que existe:**
- `whatsapp_automation_control.next_execution_at` controla quando a próxima mensagem deve ser enviada
- `process-whatsapp-queue` (edge function cron) processa registros com `next_execution_at <= now()`
- Sending schedule (janela horária) funciona corretamente com timezone São Paulo
- Anti-loop: intervalo mínimo de 120s entre execuções

**Gaps:**
- **Sem tabela de delays dedicada** — delay é implícito no `next_execution_at`
- **Sem garantia contra execução dupla** — lock otimista (`status: processing`) ajuda, mas sem row-level lock real
- **Delays não são cancelados se conversa muda para respondida durante o intervalo** — a verificação de `last_customer_message_at` vs `last_followup_sent_at` no `process-whatsapp-queue` cobre isto parcialmente

### 5. Webhook (Recebimento) — ✅ OK

- Webhook funciona corretamente via `whatsapp-webhook` edge function
- Valida instance name, filtra grupos e status broadcasts
- Cria conversa automaticamente se não existe
- Pausa automação quando cliente responde (`status: responded`)
- Processa tipos: text, image, video, audio, document

**Ponto de atenção:** Sem validação de assinatura do webhook (qualquer requisição é aceita)

### 6. Controle de Duplicidade — ✅ OK

- Unique constraint `(account_id, message_id)` em `whatsapp_messages`
- Upsert com `onConflict` tanto no envio quanto no webhook
- Anti-loop de 120s no `process-whatsapp-queue`

### 7. Rate Limit — ❌ NÃO IMPLEMENTADO

- Sem controle de mensagens por segundo
- Sem limite por número
- O `process-whatsapp-queue` processa até 50 registros sequencialmente, o que naturalmente limita, mas sem controle formal

### 8. Retries — ❌ NÃO IMPLEMENTADO

- Se envio falha, automação volta para `status: active` sem incrementar retry
- Sem campo `retry_count` na tabela
- Sem backoff exponencial
- Mensagens falhadas são simplesmente reagendadas na próxima execução do cron

### 9. Fluxos de Automação — ⚠️ LINEAR APENAS

- Fluxo é linear: greeting steps → followup steps
- Cada step tem `phase` + `step_position` + `delay_minutes`
- Templates atuais: greeting (2 steps), followup (3 steps)
- **Sem nodes condicionais, sem branches, sem loops**
- **Sem validação de integridade do fluxo** (se deletar step intermediário, pula para finished)

### 10. Interrupção por Atendimento Humano — ✅ OK

- Webhook detecta resposta do cliente e muda automação para `responded`
- `process-whatsapp-queue` também verifica `last_customer_message_at` antes de enviar
- **Porém:** não existe conceito de "handover humano" explícito — é só pausa automática

### 11. Histórico de Conversa — ✅ OK

- Todas as mensagens (enviadas e recebidas) são salvas em `whatsapp_messages`
- Com: `message_id`, `is_from_me` (direction), `content`, `created_at`, `status`, `message_type`
- Index em `conversation_id` para queries rápidas

### 12. Logs do Sistema — ⚠️ PARCIAL

- Console.log em todas as edge functions com prefixos `[whatsapp-send]`, `[whatsapp-webhook]`, `[process-queue]`
- Logs incluem IDs relevantes (automation_id, lead_id, conversation_id)
- **Sem tabela de logs persistente** — logs ficam apenas no Supabase Edge Function logs (retenção limitada)
- **Sem alertas automáticos** para taxa de erro

---

## Plano de Correções Prioritárias

Implementar as seguintes melhorias em ordem de prioridade:

### Prioridade 1 — Integridade de Dados
1. **Unique constraint** `(account_id, phone_number)` em `whatsapp_conversations` para evitar conversas duplicadas
2. **Retry counter** — adicionar campo `retry_count` e `last_error` em `whatsapp_automation_control`
3. **Limitar retries a 3** no `process-whatsapp-queue` com backoff

### Prioridade 2 — Segurança
4. **Validação de assinatura** no webhook (secret compartilhado com Evolution API)
5. **Rate limiting básico** — delay de 1s entre envios no `process-whatsapp-queue`

### Prioridade 3 — Robustez
6. **Tabela de logs** para auditoria persistente (`whatsapp_automation_logs`)
7. **Enum/CHECK constraint** para `status` em `whatsapp_automation_control`
8. **Cancelamento de automações órfãs** — cron job para fechar automações `active` sem `next_execution_at` há mais de 48h

### Alterações Técnicas

**Migration SQL:**
- ADD UNIQUE `(account_id, phone_number)` ON `whatsapp_conversations`
- ADD columns `retry_count integer DEFAULT 0`, `last_error text` ON `whatsapp_automation_control`
- CREATE TABLE `whatsapp_automation_logs` (id, automation_id, event, details, created_at)
- ADD CHECK constraint on `whatsapp_automation_control.status` IN ('active','processing','paused','responded','finished')

**Edge Function Updates:**
- `process-whatsapp-queue`: add retry logic with max 3 retries, 1s delay between sends, log to `whatsapp_automation_logs`
- `whatsapp-webhook`: add optional signature validation

**Arquivos afetados:**
- `supabase/functions/process-whatsapp-queue/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- Migration SQL (nova)
- `src/hooks/useWhatsApp.tsx` (minor: expose retry info)

