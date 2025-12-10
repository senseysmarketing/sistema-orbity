-- Create table to track Google Calendar events per user per meeting
CREATE TABLE public.meeting_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  google_calendar_event_id TEXT NOT NULL,
  calendar_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

-- Enable RLS
ALTER TABLE public.meeting_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own calendar events"
  ON public.meeting_calendar_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage calendar events"
  ON public.meeting_calendar_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_meeting_calendar_events_meeting_id ON public.meeting_calendar_events(meeting_id);
CREATE INDEX idx_meeting_calendar_events_user_id ON public.meeting_calendar_events(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_calendar_events_updated_at
  BEFORE UPDATE ON public.meeting_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();