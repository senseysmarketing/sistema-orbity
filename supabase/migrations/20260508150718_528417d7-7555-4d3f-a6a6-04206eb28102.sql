-- Drop the old restricted policy
DROP POLICY IF EXISTS "Agency admins can manage integrations" ON public.agency_integrations;

-- Create a new, more permissive policy for managing integrations
CREATE POLICY "Agency members can manage integrations" 
ON public.agency_integrations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE agency_users.agency_id = agency_integrations.agency_id 
    AND agency_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_users 
    WHERE agency_users.agency_id = agency_integrations.agency_id 
    AND agency_users.user_id = auth.uid()
  )
);