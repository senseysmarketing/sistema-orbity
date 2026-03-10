

# Check-up Completo: Sistema WhatsApp Automation

## Status Geral: ✅ Saudável

Todos os componentes estão corretamente implementados e interligados. O log `"Message processed"` confirma que o webhook está funcionando com a instância `orbity_7bef1258`.

---

## 1. Fluxo de Saudação (Greeting) ✅

**Como funciona:**
- Lead é capturado via `capture-lead` ou `facebook-leads`
- Auto-enrollment verifica: conta WhatsApp conectada + template `greeting` step 1 ativo
- Cria registro em `whatsapp_automation_control` com `current_phase: 'greeting'`, `current_step_position: 1`
- `next_execution_at` = agora + `delay_minutes` do template
- O cron (`process-whatsapp-queue`, a cada minuto) busca registros com `status: 'active'` e `next_execution_at <= now()`

**Sequência de etapas:**
1. Envia greeting step 1 → busca template greeting step 2
2. Se existe step 2 → agenda `next_execution_at` = agora + delay do step 2
3. Quando não há mais steps de greeting → transiciona para `phase: 'followup'`, `step_position: 1`

## 2. Fluxo de Follow-up ✅

- Após última etapa de greeting, busca template `followup` step 1
- Se existe → `newPhase = 'followup'`, `newStep = 1`, agenda delay
- Cada step de followup segue a mesma lógica sequencial
- Quando não há mais steps → `conversation_state: 'closed_no_reply'`, `status: 'finished'`

**Delays:** Cada step usa o `delay_minutes` do **próximo** template (não do atual), calculado a partir do momento do envio. Correto.

## 3. Detecção de Resposta do Cliente ✅ (Dupla proteção)

**Proteção 1 - Webhook (tempo real):**
- `whatsapp-webhook` recebe mensagem com `is_from_me: false`
- Atualiza `last_customer_message_at` na conversa
- Busca automações ativas (`status IN ('active', 'processing')`) para aquela conversa
- Muda status para `'responded'`, state para `'customer_replied'`
- Registra log `'customer_replied_webhook'`

**Proteção 2 - Queue processor (redundância):**
- Antes de enviar, `process-whatsapp-queue` compara `last_customer_message_at > last_followup_sent_at`
- Se cliente respondeu após último follow-up → marca como `'responded'`

## 4. Mecanismos de Segurança ✅

| Mecanismo | Valor | Status |
|---|---|---|
| Anti-loop (MIN_INTERVAL) | 120s entre envios | ✅ |
| Rate limit | 1s entre envios na fila | ✅ |
| Max retries | 3 tentativas | ✅ |
| Backoff exponencial | 30s, 2min, 5min | ✅ |
| Optimistic lock | `status: 'processing'` durante envio | ✅ |
| Janela de horário (São Paulo) | Reagenda se fora do horário | ✅ |
| Filtro por fonte | `allowed_sources` check | ✅ |
| State machine | Trigger `validate_automation_status_transition` | ✅ |
| Idempotência mensagens | `upsert` com `(account_id, message_id)` | ✅ |

## 5. Envio (`whatsapp-send`) ✅

- Usa secrets centralizados como fallback (`EVOLUTION_API_URL` / `EVOLUTION_API_KEY`)
- Endpoint: `POST /message/sendText/{instance_name}`
- Salva mensagem no DB antes do webhook retornar (idempotência)
- Atualiza `last_message_at` e `last_message_is_from_me` na conversa

## 6. Variáveis Dinâmicas nos Templates ✅

Suporte a: `{{nome}}`, `{{email}}`, `{{telefone}}`, `{{empresa}}`, `{{formulario:campo}}`
Lookup normalizado com case-insensitive e underscore matching.

## Conclusão

O sistema está completo e funcional. Nenhuma correção necessária. O fluxo end-to-end é:

```text
Lead capturado → Auto-enroll → Greeting Step 1 (após delay) → ... → Greeting Step N
  → Follow-up Step 1 (após delay) → ... → Follow-up Step N → Finalizado

  ↕ A QUALQUER MOMENTO: cliente responde → webhook cancela automação
```

