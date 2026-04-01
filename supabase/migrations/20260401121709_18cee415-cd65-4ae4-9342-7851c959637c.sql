
-- Habilitar extensões necessárias para agendamento
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Criar cron job para fechamento mensal (meia-noite do dia 1º de cada mês)
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
