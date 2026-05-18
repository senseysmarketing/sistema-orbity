ALTER TABLE public.agencies 
ADD COLUMN IF NOT EXISTS welcome_message_sent_at TIMESTAMP WITH TIME ZONE;