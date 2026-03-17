

# Corrigir exibição de mensagens enviadas pelo WhatsApp nativo no modal

## Causa raiz identificada

O webhook está configurado apenas com 3 eventos: `MESSAGES_UPSERT` (recebimento), `MESSAGES_UPDATE` (status) e `CONNECTION_UPDATE`. **Falta o evento `SEND_MESSAGE`**, que é o evento da Evolution API v2 para mensagens enviadas pelo app nativo do WhatsApp. As mensagens que aparecem no modal (as duas primeiras de 11:38 e 11:41) foram salvas diretamente pelo `whatsapp-send` do CRM, não pelo webhook.

As mensagens de 13:30, 13:31 e 14:58 (enviadas pelo app do WhatsApp) nunca chegaram ao webhook, por isso não estão no banco.

## Correções

### 1. Adicionar `SEND_MESSAGE` à configuração do webhook (`whatsapp-connect/index.ts`)
- Adicionar `'SEND_MESSAGE'` ao array de events na configuração do webhook
- Isso faz a Evolution API enviar o evento `send.message` quando mensagens são enviadas do celular

### 2. Tratar evento `send.message` no webhook handler (`whatsapp-webhook/index.ts`)
- Adicionar bloco `if (event === 'send.message')` que reutiliza a mesma lógica de `messages.upsert` mas força `isFromMe = true`
- O payload de `send.message` tem estrutura similar: `data.key.remoteJid`, `data.key.id`, `data.message`
- Salvar a mensagem na conversa correta usando as variantes de telefone já existentes
- Não disparar detecção de resposta do cliente (é mensagem enviada)

### 3. Reconfigurar webhook da instância existente
- Como a instância já está criada, o webhook precisa ser reconfigurado para incluir o novo evento
- A ação `check_webhook` em `whatsapp-connect` já reconfigura o webhook automaticamente -- basta garantir que ela use a mesma lista de eventos atualizada

### Arquivos modificados
- `supabase/functions/whatsapp-connect/index.ts` -- adicionar `SEND_MESSAGE` aos events
- `supabase/functions/whatsapp-webhook/index.ts` -- tratar `send.message` event
- Redeploy de ambas as functions
- Após deploy, o usuário deve clicar em "Verificar Webhook" nas configurações do WhatsApp para reconfigurar a instância com o novo evento

