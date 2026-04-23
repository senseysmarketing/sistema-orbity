

# Correção do Espelhamento de Conversas WhatsApp e Detecção de Resposta

## Diagnóstico

Inspecionando o banco e os logs, encontrei a raiz do problema:

1. **199 mensagens recebidas nos últimos 7 dias** — o webhook do Evolution API ESTÁ entregando mensagens. O problema NÃO é entrega.
2. **Conversas órfãs**: dezenas de conversas com `last_customer_message_at` recente porém `lead_id = NULL`. Exemplos reais: `553799521336`, `5516991700586`, `5511972040042` — todas com cliente respondendo nas últimas 24h, sem lead vinculado.
3. **Causa raiz da vinculação falhar**: o webhook tenta linkar via `find_lead_by_normalized_phone` apenas no momento da mensagem. Se o lead não existe **naquele instante exato** (ex.: cadastro posterior, número levemente diferente, captura via webhook depois), a conversa fica órfã **para sempre**.
4. **Sintoma no chat do lead**: `useLeadConversation` busca conversa filtrando por `account_id + lead_id`. Se a única conversa existente está órfã (sem `lead_id`), o chat aparece vazio mesmo havendo mensagens no banco do mesmo número.
5. **Sintoma na automação**: `findActiveAutomations` por `lead_id` falha quando a conversa órfã não tem como localizar a automação ativa pelo número — então o status nunca muda para `responded` e os follow-ups continuam disparando.
6. **Sintoma no CRM Vivo**: `promoteLeadOnReply` exige `conversation.lead_id`. Se a conversa está órfã, o card nunca move de coluna.

## Correções

### 1. Vinculação retroativa no frontend (`useLeadConversation`)

Em `src/hooks/useWhatsApp.tsx`, modificar `useLeadConversation` para:

- 1ª tentativa: buscar conversa por `account_id + lead_id` (atual).
- 2ª tentativa (fallback): se não encontrar e o lead tiver telefone, buscar por **variantes do telefone** (mesma lógica de `phoneVariants` do webhook) entre conversas órfãs do mesmo `account_id`.
- Ao encontrar uma conversa órfã que casa, **fazer UPDATE imediato** setando `lead_id` (auto-cura). Próximas vezes já vão pelo caminho rápido.

Resultado: conversas existentes que ficaram órfãs passam a aparecer no chat do lead automaticamente assim que o usuário abrir o card.

### 2. Vinculação por telefone também na automação (webhook)

Em `supabase/functions/whatsapp-webhook/index.ts`, expandir `findActiveAutomations`:

- Após falhar busca por `conversation_id` e por `lead_id`, fazer 3ª tentativa: buscar automações ativas/processing **pela conversa do mesmo phone_number** (variants), não só pelo conversation_id literal. Isso resolve o caso de a conversa ter sido recriada ou de haver duas conversas para o mesmo número.

### 3. Função utilitária de re-link em massa

Criar function SQL `relink_orphan_whatsapp_conversations(p_agency_id uuid)` que:

- Pega todas as conversas com `lead_id IS NULL` da agência.
- Para cada uma, tenta casar com leads via `find_lead_by_normalized_phone`.
- Atualiza `lead_id` quando encontrar match.

Expor um botão discreto **"Sincronizar conversas com leads"** na tela de Configurações > Integrações > WhatsApp (já existe `WhatsAppIntegration.tsx`), que chama essa função e mostra quantas foram religadas. Útil para a vinculação inicial e para manutenção.

### 4. Trigger automático ao criar/editar lead com telefone

Adicionar trigger AFTER INSERT OR UPDATE OF phone na tabela `leads`:

- Quando um lead é criado/atualizado com telefone, varre conversas órfãs daquela agência e linka automaticamente as que casarem por variants.
- Isso garante que **leads cadastrados depois** das mensagens já chegam linkados.

### 5. Promoção do CRM Vivo retroativa

No webhook, após linkar uma conversa órfã ao lead (caso 4), também executar `promoteLeadOnReply` se a mensagem que disparou o link veio do cliente — mas como esse cenário é coberto pelo trigger SQL e pelo botão manual, garantir só que o trigger NÃO duplica histórico (verificar `lead_history` antes de inserir o evento `whatsapp_interaction`).

## Arquivos editados

- `src/hooks/useWhatsApp.tsx` — `useLeadConversation` com fallback por telefone + auto-cura.
- `supabase/functions/whatsapp-webhook/index.ts` — `findActiveAutomations` com 3ª etapa por phone variants.
- `src/components/settings/WhatsAppIntegration.tsx` — botão "Sincronizar conversas com leads".
- Migração SQL — função `relink_orphan_whatsapp_conversations(uuid)` + trigger em `leads` para re-link automático.

## Sem mudanças

- Estrutura das tabelas `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_automation_control` — preservada.
- Lógica de envio (`whatsapp-send`), sync manual (`whatsapp-sync-messages`), conexão (`whatsapp-connect`) — intactas.
- Régua de cobrança (`purpose='billing'`) e demais features — não afetadas.
- Configuração do Evolution API — não muda.

