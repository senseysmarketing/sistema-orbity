

# Configuração Automática de Webhook na Evolution API

## Problema
O webhook da Evolution API precisa ser configurado manualmente pelo usuário no painel da Evolution. Sem ele, o sistema não recebe eventos de mensagens recebidas, e a automação de follow-up envia mensagens mesmo quando o cliente já respondeu.

## Solução
Adicionar configuração automática do webhook em 3 momentos dentro da edge function `whatsapp-connect`:

1. **Na criação da instância** (action `connect`) — logo após criar a instância
2. **Ao detectar conexão** (action `status`) — quando o status muda para `connected`
3. **Nova action `check_webhook`** — para verificação/auto-cura sob demanda

## Mudanças Técnicas

### Arquivo: `supabase/functions/whatsapp-connect/index.ts`

**1. Criar função helper `configureWebhook`:**
```typescript
async function configureWebhook(apiUrl: string, apiKey: string, instanceName: string) {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
  
  const res = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      webhookByEvents: false,
      webhookBase64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ],
    }),
  });
  
  const data = await res.json();
  console.log('[whatsapp-connect] Webhook configured:', JSON.stringify(data));
  return { success: res.ok, data };
}
```

**2. Chamar no action `connect`** — após criar a instância (linha ~80), antes de buscar QR:
```typescript
await configureWebhook(api_url.replace(/\/$/, ''), api_key, instance_name);
```

**3. Chamar no action `status`** — quando detecta `isConnected === true` (linha ~136):
```typescript
if (isConnected) {
  await configureWebhook(account.api_url, account.api_key, account.instance_name);
}
```

**4. Adicionar action `check_webhook`** — para verificação e auto-cura:
Faz `GET /webhook/find/{instance}`, se webhook está vazio ou URL errada, reconfigura automaticamente.

### Eventos selecionados
| Evento | Motivo |
|--------|--------|
| `MESSAGES_UPSERT` | Detectar mensagens recebidas do cliente |
| `MESSAGES_UPDATE` | Atualizar status de entrega |
| `CONNECTION_UPDATE` | Detectar desconexão/reconexão |

### Resultado
- Webhook configurado automaticamente ao conectar
- Reconfigurado sempre que status é verificado e instância está conectada
- Action de verificação para auto-cura
- Usuário nunca precisa abrir o painel da Evolution

