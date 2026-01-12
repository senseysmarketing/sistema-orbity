-- Agendar sincronização automática de investimento do Meta a cada 8 horas
SELECT cron.schedule(
  'facebook-investment-sync',
  '0 */8 * * *',
  $$
  SELECT net.http_post(
    url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/facebook-sync-cron',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs'
    ),
    body:='{}'::jsonb
  ) as request_id;
  $$
);