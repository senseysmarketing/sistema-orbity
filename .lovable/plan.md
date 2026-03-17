

# Check-up Completo: Sistema WhatsApp Automation

## Status Geral: ✅ Saudável (após fixes em 17/03/2026)

---

## Bugs Corrigidos (17/03/2026)

### Bug 1: `messages.update` criava mensagens fantasma ✅ CORRIGIDO
- **Problema**: Evolution API v2 envia `messages.update` como array de status updates (READ/DELIVERED), não como objeto. O código antigo fazia `data?.key` que retornava `undefined` em arrays, criando 716 mensagens fantasma com phone_number vazio.
- **Fix**: Tratamento separado para `messages.update` — apenas atualiza status de mensagens existentes, nunca cria conversas ou mensagens novas.

### Bug 2: RPC `find_lead_by_normalized_phone` não existia ✅ CORRIGIDO
- **Problema**: O webhook chamava esta RPC para linkar conversas a leads, mas ela nunca foi criada. Falhava silenciosamente, impedindo a detecção de respostas via fallback de lead_id.
- **Fix**: Criada a função SQL `find_lead_by_normalized_phone` com `regexp_replace` para normalizar telefones.

### Bug 3: IDs do Meta Messenger (`@lid`) não filtrados ✅ CORRIGIDO
- **Problema**: Números como `37705652138094@lid` são IDs do Meta Messenger, não números WhatsApp. Criavam conversas lixo.
- **Fix**: Adicionada validação `isValidWhatsAppJid()` que rejeita `@lid`, `@g.us`, `status@broadcast`, e JIDs sem `@s.whatsapp.net`.

### Limpeza de dados ✅ EXECUTADA
- 716 mensagens fantasma deletadas
- Conversa fantasma `77e1005b` deletada
- Conversas com phone_number vazio/curto limpas

### Fallback extra no queue processor ✅ ADICIONADO
- Além do fallback por `lead_id`, agora busca respostas por variantes de telefone normalizado quando nenhuma resposta é encontrada na conversa principal.

---

## Fluxo Atualizado

```text
Lead capturado → Auto-enroll → Greeting Step 1 (após delay) → ... → Greeting Step N
  → Follow-up Step 1 (após delay) → ... → Follow-up Step N → Finalizado

  ↕ A QUALQUER MOMENTO: cliente responde → webhook cancela automação
  ↕ PROTEÇÃO TRIPLA: 1) webhook direto, 2) lead_id fallback, 3) phone fallback
```

## Eventos do Webhook

| Evento | Tratamento |
|---|---|
| `messages.upsert` | Processa mensagem nova, cria/busca conversa, detecta resposta |
| `messages.update` | **Apenas atualiza status** (READ/DELIVERED) de mensagens existentes |
| `connection.update` | Atualiza status de conexão da conta |
