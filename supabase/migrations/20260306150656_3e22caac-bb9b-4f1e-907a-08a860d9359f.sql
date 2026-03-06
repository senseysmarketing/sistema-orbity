ALTER TABLE public.facebook_lead_integrations 
ADD CONSTRAINT unique_agency_form 
UNIQUE (agency_id, form_id);