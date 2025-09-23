-- Allow authenticated users to view clients for task management
CREATE POLICY "Authenticated users can view clients for tasks" 
ON public.clients 
FOR SELECT 
USING (true);