# 📧 Configuração de Resumos Diários por Email

## ✅ O que foi implementado

1. **Edge Function `send-daily-digest`**: Envia resumos diários formatados por email
2. **Coluna `email_digest`**: Adicionada à tabela `user_notification_channels`
3. **Formatador HTML**: Template bonito e responsivo para os resumos
4. **UI atualizada**: Checkbox para ativar/desativar resumos diários nas preferências

## 🚀 Como funciona

### Para o usuário:
1. Acesse **Configurações** → **Notificações**
2. Ative a opção "Email"
3. Marque "Resumo diário"
4. Salve as preferências

### Sistema:
- **Quando ativado**: Usuário recebe 1 email por dia (às 8h) com todas as notificações do dia anterior
- **Quando desativado**: Usuário recebe 1 email para cada notificação (comportamento atual)

## ⚙️ Configuração do Cron Job (IMPORTANTE)

Para ativar o envio automático diário, você precisa configurar um cron job no Supabase:

### Passo a passo:

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/ovookkywclrqfmtumelw)

2. Vá em **Database** → **Extensions** e ative:
   - `pg_cron`
   - `pg_net`

3. Execute o seguinte SQL no **SQL Editor**:

```sql
-- Criar cron job para enviar resumos diários às 8h BRT (11h UTC)
SELECT cron.schedule(
  'send-daily-email-digest',
  '0 11 * * *', -- Todos os dias às 11h UTC (8h BRT)
  $$
  SELECT
    net.http_post(
        url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/send-daily-digest',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

4. Verifique se o cron job foi criado:

```sql
SELECT * FROM cron.job WHERE jobname = 'send-daily-email-digest';
```

## 🔍 Verificação

### Ver jobs agendados:
```sql
SELECT * FROM cron.job;
```

### Ver execuções do cron:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-email-digest')
ORDER BY start_time DESC
LIMIT 10;
```

### Testar manualmente:
```bash
curl -X POST 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/send-daily-digest' \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs" \
  -H "Content-Type: application/json"
```

## 📊 Logs

Ver logs da edge function no dashboard:
- [Logs da função send-daily-digest](https://supabase.com/dashboard/project/ovookkywclrqfmtumelw/functions/send-daily-digest/logs)

## 🎨 Template do Email

O email de resumo diário inclui:

- **Resumo geral**: Contadores por categoria (tarefas, posts, pagamentos, etc.)
- **Detalhes**: Até 5 itens mais recentes de cada categoria
- **Design**: Template HTML responsivo e bonito
- **Horário personalizado**: Configurável (padrão: 8h BRT)

## 🔄 Alterando o horário

Para mudar o horário do envio, edite o cron schedule:

```sql
-- Alterar para 9h BRT (12h UTC)
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'send-daily-email-digest'),
  schedule => '0 12 * * *'
);
```

Formato cron: `minuto hora dia mês dia_semana`
- `0 11 * * *` = Todos os dias às 11h UTC
- `0 */6 * * *` = A cada 6 horas
- `0 9 * * 1-5` = Dias úteis às 9h

## ❌ Desativar o cron job

```sql
SELECT cron.unschedule('send-daily-email-digest');
```

## 📝 Notas importantes

1. **Timezone**: O cron usa UTC. Brasil (BRT) = UTC-3
2. **Emails**: Apenas para usuários com `email_digest: true`
3. **Período**: Resume notificações das últimas 24h
4. **Remetente**: `Orbity <contato@notificacoes.orbityapp.com.br>`
5. **Logs**: Todas as entregas são registradas em `notification_delivery_logs`
