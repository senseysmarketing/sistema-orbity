-- Enable pg_cron and pg_net extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create cron job to send daily summary notifications at 8 AM (Brasília time = 11 AM UTC)
SELECT cron.schedule(
  'daily-summary-notification',
  '0 11 * * *', -- Every day at 11 AM UTC (8 AM Brasília time)
  $$
  SELECT
    net.http_post(
        url:='https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92b29ra3l3Y2xycWZtdHVtZWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjkyMjUsImV4cCI6MjA3NDE0NTIyNX0.NoHXndIJVUZ_dV5pEGZWfw2RUlEutBrgKaIDdlOazHs"}'::jsonb,
        body:='{"action": "daily_summary"}'::jsonb
    ) as request_id;
  $$
);