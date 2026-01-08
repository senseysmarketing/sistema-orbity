-- Drop the old constraint and create a new one with the temperature values
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_priority_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_priority_check 
CHECK (priority IN ('cold', 'warm', 'hot'));

-- Update any existing leads with old priority values to new temperature values
UPDATE public.leads SET priority = 'cold' WHERE priority = 'low';
UPDATE public.leads SET priority = 'warm' WHERE priority = 'medium';
UPDATE public.leads SET priority = 'hot' WHERE priority = 'high';