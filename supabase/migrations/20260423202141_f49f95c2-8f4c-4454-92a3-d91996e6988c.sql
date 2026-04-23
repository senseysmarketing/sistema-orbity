CREATE POLICY "Master admins can manage all subscriptions"
ON public.agency_subscriptions
FOR ALL
TO authenticated
USING (public.is_master_agency_admin())
WITH CHECK (public.is_master_agency_admin());