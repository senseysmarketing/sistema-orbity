-- Create table for custom lead statuses
CREATE TABLE public.lead_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  order_position INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

-- Create policies for lead statuses
CREATE POLICY "Agency admins can manage lead statuses" 
ON public.lead_statuses 
FOR ALL 
USING (is_agency_admin(agency_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_lead_statuses_updated_at
BEFORE UPDATE ON public.lead_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();