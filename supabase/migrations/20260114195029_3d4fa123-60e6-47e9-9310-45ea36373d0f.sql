-- Permitir que membros da agência possam atualizar selected_ad_accounts
CREATE POLICY "Agency members can update selected ad accounts"
  ON selected_ad_accounts
  FOR UPDATE
  TO authenticated
  USING (user_belongs_to_agency(agency_id))
  WITH CHECK (user_belongs_to_agency(agency_id));

-- Permitir que membros da agência possam inserir selected_ad_accounts
CREATE POLICY "Agency members can insert selected ad accounts"
  ON selected_ad_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_belongs_to_agency(agency_id));