-- Create an enum for WhatsApp reminder status
DO $$ BEGIN
    CREATE TYPE public.whatsapp_reminder_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add tracking columns to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS last_whatsapp_reminder_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS whatsapp_reminder_status public.whatsapp_reminder_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS whatsapp_reminder_error TEXT;

-- Create an index for faster processing of pending reminders
CREATE INDEX IF NOT EXISTS idx_meetings_whatsapp_reminder_pending 
ON public.meetings (whatsapp_reminder_enabled, whatsapp_reminder_status, start_time) 
WHERE (whatsapp_reminder_enabled = true AND whatsapp_reminder_status = 'pending');