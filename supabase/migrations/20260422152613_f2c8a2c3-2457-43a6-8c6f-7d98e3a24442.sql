ALTER TABLE public.agency_users 
  ADD COLUMN IF NOT EXISTS custom_role TEXT;

ALTER TABLE public.agency_users 
  ADD COLUMN IF NOT EXISTS app_permissions JSONB 
  DEFAULT '{"crm": true, "tasks": true, "financial": false, "traffic": false, "social_media": false, "agenda": true}'::jsonb;