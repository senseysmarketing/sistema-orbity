ALTER TABLE public.meetings
  ADD COLUMN whatsapp_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN client_whatsapp text,
  ADD COLUMN reminder_hours_before integer NOT NULL DEFAULT 2;