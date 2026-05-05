-- Garantir extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remover job antigo se existir (idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('daily-billing-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Agendar job diário às 12:00 UTC (09:00 BRT)
SELECT cron.schedule(
  'daily-billing-reminders',
  '0 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-billing-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('time', now()::text, 'source', 'pg_cron')::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);

-- Disparar execução imediata para processar cobranças de hoje
SELECT net.http_post(
  url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-billing-reminders',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('time', now()::text, 'source', 'manual_trigger_after_schedule')::jsonb,
  timeout_milliseconds := 300000
);