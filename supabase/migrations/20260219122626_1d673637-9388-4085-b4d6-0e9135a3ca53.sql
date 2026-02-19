
-- Remover política antiga que não tem WITH CHECK
DROP POLICY IF EXISTS "Agency admins can manage custom statuses" ON social_media_custom_statuses;

-- Política para SELECT (leitura de membros da agência)
DROP POLICY IF EXISTS "Agency members can view custom statuses" ON social_media_custom_statuses;
CREATE POLICY "Agency members can view custom statuses"
ON social_media_custom_statuses FOR SELECT
TO authenticated
USING (user_belongs_to_agency(agency_id));

-- Política para INSERT com WITH CHECK explícito
CREATE POLICY "Agency admins can insert custom statuses"
ON social_media_custom_statuses FOR INSERT
TO authenticated
WITH CHECK (is_agency_admin(agency_id));

-- Política para UPDATE com USING e WITH CHECK
CREATE POLICY "Agency admins can update custom statuses"
ON social_media_custom_statuses FOR UPDATE
TO authenticated
USING (is_agency_admin(agency_id))
WITH CHECK (is_agency_admin(agency_id));

-- Política para DELETE
CREATE POLICY "Agency admins can delete custom statuses"
ON social_media_custom_statuses FOR DELETE
TO authenticated
USING (is_agency_admin(agency_id));
