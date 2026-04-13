CREATE POLICY "Master agency admins can view all agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (is_master_agency_admin());