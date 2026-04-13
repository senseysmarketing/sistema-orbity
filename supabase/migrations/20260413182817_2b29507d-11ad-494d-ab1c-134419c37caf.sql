-- Allow master agency admins to update any agency (suspend/reactivate)
CREATE POLICY "Master agency admins can update all agencies"
ON public.agencies FOR UPDATE
USING (public.is_master_agency_admin())
WITH CHECK (public.is_master_agency_admin());