

# Configurar Cron Job para Monthly Closure

## Importante: Por que NÃO usar migration

As instruções do Supabase orientam que cron jobs com URLs e chaves específicas do projeto **não devem ser criados via migration**, pois contêm dados sensíveis do projeto. Em vez disso, o SQL deve ser executado diretamente no banco via ferramenta de query.

## Solução

Executar o seguinte SQL diretamente no banco (via supabase read/insert tool):

1. **Habilitar extensões** `pg_cron` e `pg_net` (IF NOT EXISTS)
2. **Criar o cron job** `monthly-closure-job` com frequência `0 0 1 * *` (meia-noite do dia 1º)
3. **Chamar** `net.http_post` apontando para `https://ovookkywclrqfmtumelw.supabase.co/functions/v1/monthly-closure` com a anon key do projeto

O SQL usará os valores reais do projeto (URL e anon key já conhecidos), sem placeholders.

## Detalhes Técnicos

```sql
-- Extensões
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Cron job
select cron.schedule(
  'monthly-closure-job',
  '0 0 1 * *',
  $$
    select net.http_post(
      url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/monthly-closure',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
      body:='{"time": "scheduled"}'::jsonb
    );
  $$
);
```

### Arquivo
Nenhum arquivo criado — SQL executado diretamente no banco de dados.

