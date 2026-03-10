

# Correção: Formato do payload do webhook na Evolution API

## Problema
A Evolution API retorna erro `400 Bad Request` com mensagem `"instance requires property \"webhook\""`. O payload está sendo enviado com campos no nível raiz, mas a API espera tudo aninhado dentro de `{ webhook: { ... } }`.

## Correção

**Arquivo:** `supabase/functions/whatsapp-connect/index.ts`

Alterar a função `configureWebhook` (linha 16) de:

```json
{
  "enabled": true,
  "url": "...",
  "events": [...]
}
```

Para:

```json
{
  "webhook": {
    "enabled": true,
    "url": "...",
    "webhookByEvents": false,
    "webhookBase64": false,
    "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"]
  }
}
```

Isso é a única mudança necessária. Após o deploy, o webhook será configurado automaticamente na próxima verificação de status ou reconexão.

