-- Create a table for email templates
CREATE TABLE public.email_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for agency access
CREATE POLICY "Users can view their agency's email templates" 
ON public.email_templates 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE agency_users.agency_id = email_templates.agency_id 
        AND agency_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create email templates for their agency" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE agency_users.agency_id = email_templates.agency_id 
        AND agency_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their agency's email templates" 
ON public.email_templates 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE agency_users.agency_id = email_templates.agency_id 
        AND agency_users.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their agency's email templates" 
ON public.email_templates 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.agency_users 
        WHERE agency_users.agency_id = email_templates.agency_id 
        AND agency_users.user_id = auth.uid()
    )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
