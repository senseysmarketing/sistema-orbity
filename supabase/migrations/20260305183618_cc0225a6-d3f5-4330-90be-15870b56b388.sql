ALTER TABLE public.whatsapp_accounts 
ADD COLUMN IF NOT EXISTS sending_schedule jsonb 
DEFAULT '{"enabled": false, "start_hour": 8, "end_hour": 18, "allowed_days": [1,2,3,4,5]}'::jsonb;