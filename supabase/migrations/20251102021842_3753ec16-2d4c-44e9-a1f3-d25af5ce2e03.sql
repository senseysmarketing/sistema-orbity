-- Add email_digest column to user_notification_channels
ALTER TABLE public.user_notification_channels 
ADD COLUMN IF NOT EXISTS email_digest boolean DEFAULT false;

COMMENT ON COLUMN public.user_notification_channels.email_digest IS 'When true, user receives daily email digest instead of individual emails';