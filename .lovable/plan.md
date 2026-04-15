

# Restaurar Automação WhatsApp CRM

## Alterações

### 1. Filtro `purpose = 'general'` nas Edge Functions

**`supabase/functions/capture-lead/index.ts`** (linha 31):
Adicionar `.eq('purpose', 'general')` antes do `.maybeSingle()` na query de `whatsapp_accounts`.

**`supabase/functions/facebook-leads/index.ts`** (linha 586):
Mesmo filtro `.eq('purpose', 'general')` antes do `.maybeSingle()`.

### 2. Cron Job — Limpar antigo e criar novo

Executar via SQL insert tool (não migration):

```sql
-- Limpar jobs antigos
SELECT cron.unschedule('process-whatsapp-queue');

-- Criar novo job a cada 2 minutos
SELECT cron.schedule(
  'process-whatsapp-queue',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-whatsapp-queue',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### 3. Deploy das Edge Functions
Deploy de `capture-lead` e `facebook-leads`.

## Arquivos alterados
1. `supabase/functions/capture-lead/index.ts`
2. `supabase/functions/facebook-leads/index.ts`
3. SQL insert para cron job

