

# Sincronizar mensagens enviadas do WhatsApp nativo via polling da Evolution API

## Diagnóstico

A Evolution API **não envia eventos webhook** para mensagens enviadas diretamente pelo app nativo do WhatsApp no celular. O evento `SEND_MESSAGE` só dispara para mensagens enviadas via API. O `MESSAGES_UPSERT` só captura mensagens recebidas (incoming).

Prova: os 2 áudios (11:32, 11:33) e o "Marcelo?" (14:55) do lead Marcelo Lima não aparecem nos logs do webhook, nem no banco de dados. As mensagens que aparecem (12:51, 12:54) foram enviadas pela automação via API.

## Solução

Criar um mecanismo de **sync on-demand** que busca mensagens diretamente da Evolution API quando o modal de WhatsApp do lead é aberto.

### 1. Nova edge function `whatsapp-sync-messages`

Endpoint que:
- Recebe `account_id` e `phone_number` do lead
- Busca a conta WhatsApp (instance_name, api_url, api_key)
- Chama `POST {api_url}/chat/findMessages/{instance}` com `where.key.remoteJid = "{phone}@s.whatsapp.net"`
- Faz upsert das mensagens retornadas no `whatsapp_messages` (usando `message_id` como chave)
- Marca mensagens com `fromMe: true` corretamente
- Retorna o total sincronizado

### 2. Atualizar `useWhatsApp.tsx`

Adicionar mutation `syncMessages` que chama a nova edge function.

### 3. Atualizar `WhatsAppChat.tsx`

- Chamar `syncMessages` automaticamente quando o componente monta (ou quando a conversa é carregada)
- Adicionar botão de refresh manual (ícone de sync) no header do chat
- Mostrar indicador de loading durante sync

### Arquivos
- **Criar**: `supabase/functions/whatsapp-sync-messages/index.ts`
- **Editar**: `src/hooks/useWhatsApp.tsx` — adicionar `syncMessages` mutation
- **Editar**: `src/components/crm/WhatsAppChat.tsx` — trigger sync on mount + botão refresh
- **Editar**: `supabase/config.toml` — adicionar config da nova function (verify_jwt = false)

