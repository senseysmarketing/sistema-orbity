## Objetivo
Evitar que a Evolution API gere o preview (card com imagem/título do site) ao enviar mensagens com link — enviar apenas o texto/link puro.

## Mudança
A Evolution API aceita o campo `linkPreview: false` no payload de `sendText`. Hoje ele não é enviado, então o preview é gerado por padrão.

## Arquivo a alterar
`supabase/functions/whatsapp-send/index.ts` (linha ~85-95) — adicionar `linkPreview: false` no body do POST para `/message/sendText/{instance}`:

```ts
body: JSON.stringify({
  number: formattedPhone,
  text: message,
  linkPreview: false,
}),
```

Isso afeta TODOS os envios via `whatsapp-send` (régua de cobrança, CRM, etc.), o que é o comportamento desejado: links sempre limpos, sem card de preview.

## Deploy
Após o ajuste, fazer deploy individual da edge function `whatsapp-send`.

## Validação
Disparar um envio de teste (régua de cobrança ou mensagem manual no CRM) com um link e confirmar no WhatsApp do cliente que o link aparece sem o card de preview.