

# Fix: Habilitar `webhookByEvents` na Evolution API

## Diagnóstico

O código atual usa `byEvents: false`. Conforme reportado, algumas builds da Evolution API **só disparam eventos quando `webhookByEvents` (ou `byEvents`) está `true`**. Isso explicaria por que o webhook foi aceito (201) mas zero eventos reais chegaram.

## Mudança

**Arquivo:** `supabase/functions/whatsapp-connect/index.ts` (linha 17)

Alterar `byEvents: false` para `byEvents: true`.

Isso instrui a Evolution a filtrar e enviar apenas os eventos listados no array `events`, em vez de potencialmente não enviar nenhum.

## Validação adicional: action `check_webhook`

Já existe a action `check_webhook` que faz `GET /webhook/find/{instance}`. Após o deploy, reconecte a instância e use essa action para confirmar que `enabled: true` e a URL correta aparecem na resposta.

## Resumo

- Uma linha alterada: `byEvents: false` → `byEvents: true`
- Deploy automático
- Reconectar instância e enviar mensagem de teste de um telefone externo
- Monitorar logs da edge function `whatsapp-webhook`

