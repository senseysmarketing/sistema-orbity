-- Create meeting types enum
CREATE TYPE meeting_type AS ENUM (
  'commercial',
  'client', 
  'internal',
  'quick_call',
  'workshop',
  'results'
);

-- Create meeting status enum
CREATE TYPE meeting_status AS ENUM (
  'scheduled',
  'completed',
  'cancelled',
  'no_show'
);

-- Create meeting outcome enum
CREATE TYPE meeting_outcome AS ENUM (
  'win',
  'loss',
  'follow_up_needed',
  'pending'
);

-- Create meetings table
CREATE TABLE public.meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_type meeting_type NOT NULL DEFAULT 'client',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  google_meet_link TEXT,
  google_calendar_event_id TEXT,
  organizer_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  participants JSONB DEFAULT '[]'::jsonb,
  external_participants JSONB DEFAULT '[]'::jsonb,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  status meeting_status NOT NULL DEFAULT 'scheduled',
  meeting_notes TEXT,
  action_items JSONB DEFAULT '[]'::jsonb,
  outcome meeting_outcome,
  next_steps TEXT,
  follow_up_date DATE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_reason TEXT
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meetings
CREATE POLICY "Agency members can view meetings"
  ON public.meetings
  FOR SELECT
  USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can create meetings"
  ON public.meetings
  FOR INSERT
  WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Organizer or admin can update meetings"
  ON public.meetings
  FOR UPDATE
  USING (
    user_belongs_to_agency(agency_id) AND 
    (auth.uid() = organizer_id OR is_agency_admin(agency_id))
  );

CREATE POLICY "Organizer or admin can delete meetings"
  ON public.meetings
  FOR DELETE
  USING (
    user_belongs_to_agency(agency_id) AND 
    (auth.uid() = organizer_id OR is_agency_admin(agency_id))
  );

-- Create trigger for updated_at
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_meetings_agency_id ON public.meetings(agency_id);
CREATE INDEX idx_meetings_start_time ON public.meetings(start_time);
CREATE INDEX idx_meetings_organizer_id ON public.meetings(organizer_id);
CREATE INDEX idx_meetings_client_id ON public.meetings(client_id);
CREATE INDEX idx_meetings_lead_id ON public.meetings(lead_id);
CREATE INDEX idx_meetings_status ON public.meetings(status);