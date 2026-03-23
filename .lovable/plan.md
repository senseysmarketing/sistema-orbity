

# Por que as mensagens não foram enviadas hoje

## Causa raiz identificada

O status da conta WhatsApp está **`connecting`** em vez de **`connected`**.

```text
whatsapp_accounts:
  instance_name: orbity_7bef1258
  status: connecting        ← BLOQUEIO AQUI
```

No `process-whatsapp-queue`, linha 255, existe a verificação:
```javascript
if (account.status !== 'connected') {
  // volta para 'active' e pula o registro
}
```

Resultado: o cron roda a cada minuto, pega os 5 leads pendentes, tenta processar, mas ao verificar que a conta está `connecting` (não `connected`), devolve cada registro para `active` sem enviar nada. Isso se repete indefinidamente sem nenhum log visível.

O último envio bem-sucedido foi em 20/03 (quinta). Em algum momento entre quinta e hoje, a conta mudou de `connected` para `connecting` -- provavelmente por um evento `connection.update` do webhook da Evolution API.

## Correções

### 1. Corrigir o status da conta agora (migração SQL)
- `UPDATE whatsapp_accounts SET status = 'connected' WHERE id = 'a89cf7ee-...'`
- Isso desbloqueia os 5 leads pendentes imediatamente

### 2. Adicionar log quando a conta não está conectada
- No `process-whatsapp-queue`, adicionar `console.warn` quando `account.status !== 'connected'` para que no futuro esse problema seja visível nos logs

### 3. Melhorar o handler de `connection.update` no webhook
- Atualmente, o webhook define `status = 'connecting'` para estados transitórios da Evolution. Precisamos garantir que apenas `state: 'close'` marque como desconectado, e que reconexões automáticas (`state: 'open'`) restaurem para `connected`
- Revisar o handler para evitar que estados transitórios (`connecting`, `syncing`) bloqueiem o envio

### 4. Adicionar tolerância no queue processor
- Aceitar tanto `connected` quanto `connecting` como estados válidos para envio (a Evolution geralmente mantém a sessão ativa mesmo durante `connecting`)

### Arquivos
- Migração SQL: corrigir status da conta
- `supabase/functions/process-whatsapp-queue/index.ts`: log + tolerância de status
- `supabase/functions/whatsapp-webhook/index.ts`: revisar handler de `connection.update`

