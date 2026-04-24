-- Add channel_routing JSONB column to notification_preferences for the routing matrix
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS channel_routing JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.notification_preferences.channel_routing IS 
'Routing matrix: { category: { in_app: bool, push: bool, email: bool } }. Empty object means default (all channels enabled).';