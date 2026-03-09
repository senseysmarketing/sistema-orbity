
-- Create cron job to process WhatsApp automation queue every minute
SELECT cron.schedule(
  'process-whatsapp-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-whatsapp-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
