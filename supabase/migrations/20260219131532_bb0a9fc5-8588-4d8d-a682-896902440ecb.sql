
-- Remover políticas que exigem admin
DROP POLICY IF EXISTS "Agency admins can insert custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can update custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can delete custom statuses" ON social_media_custom_statuses;

-- Recriar para qualquer membro da agência
CREATE POLICY "Agency members can insert custom statuses"
ON social_media_custom_statuses FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update custom statuses"
ON social_media_custom_statuses FOR UPDATE TO authenticated
USING (user_belongs_to_agency(agency_id))
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can delete custom statuses"
ON social_media_custom_statuses FOR DELETE TO authenticated
USING (user_belongs_to_agency(agency_id));
