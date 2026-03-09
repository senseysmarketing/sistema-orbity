

# Diagnóstico: Automação WhatsApp não está processando mensagens

## Problemas encontrados

### 1. Nenhum cron job para `process-whatsapp-queue` (CAUSA RAIZ)
A edge function `process-whatsapp-queue` existe e está correta, mas **não há nenhum cron job configurado** para chamá-la periodicamente. Os cron jobs existentes são:
- `archive-old-social-media-posts`
- `process-notifications` (a cada 15 e 30 min)
- `daily-summary-notification`
- `monthly-closure-automation`
- `facebook-api-heartbeat`
- `facebook-heartbeat-job`
- `facebook-investment-sync`

**Nenhum deles chama `process-whatsapp-queue`.** Ou seja, a função nunca é executada automaticamente — ela só rodaria se alguém a chamasse manualmente via HTTP.

### 2. Tabela `whatsapp_automation_control` está vazia
Não há nenhum registro na tabela. Isso significa que, quando os leads chegam via Facebook Leads, **nenhuma automação está sendo iniciada automaticamente**. O `startAutomation` no hook `useWhatsApp` só é chamado manualmente pelo usuário via interface.

Para que a automação funcione de forma automática com leads do Facebook, seria necessário um trigger ou lógica no fluxo de captura de leads (`capture-lead` ou `facebook-leads`) que crie automaticamente os registros em `whatsapp_automation_control`.

## Solução proposta

### Passo 1: Criar cron job para `process-whatsapp-queue`
Agendar a função para rodar **a cada 1 minuto** (ou a cada 2 minutos para economia):

```sql
SELECT cron.schedule(
  'process-whatsapp-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-whatsapp-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Passo 2: Auto-iniciar automação para novos leads
Modificar a edge function `facebook-leads` (ou `capture-lead`) para que, ao receber um novo lead com telefone, crie automaticamente um registro em `whatsapp_automation_control` — desde que a agência tenha uma conta WhatsApp conectada e templates configurados. Isso eliminará a necessidade de iniciar manualmente cada automação.

### Resumo
| Problema | Causa | Solução |
|----------|-------|---------|
| Mensagens não enviadas | Nenhum cron job executa `process-whatsapp-queue` | Criar cron job a cada 1 min |
| Leads não entram na automação | `whatsapp_automation_control` vazio — automação só inicia manualmente | Auto-criar automação ao capturar lead com telefone |

