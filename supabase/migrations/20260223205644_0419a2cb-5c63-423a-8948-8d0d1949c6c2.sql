
-- Remove a policy única que bloqueia leitura para membros
DROP POLICY IF EXISTS "Agency admins can manage lead statuses" ON lead_statuses;

-- Leitura para TODOS os membros da agência (qualquer role)
CREATE POLICY "Agency members can view lead statuses"
  ON lead_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_users
      WHERE agency_users.user_id = auth.uid()
      AND agency_users.agency_id = lead_statuses.agency_id
    )
  );

-- Escrita apenas para admins/owners
CREATE POLICY "Agency admins can manage lead statuses"
  ON lead_statuses FOR ALL
  USING (is_agency_admin(agency_id))
  WITH CHECK (is_agency_admin(agency_id));
