-- Add unique constraint for ad_account_id and agency_id combination
ALTER TABLE selected_ad_accounts 
ADD CONSTRAINT unique_ad_account_per_agency 
UNIQUE (ad_account_id, agency_id);

-- Update RLS policies to automatically set agency_id and connection_id
DROP POLICY IF EXISTS "Agency admins can manage selected ad accounts" ON selected_ad_accounts;
DROP POLICY IF EXISTS "Agency members can view selected ad accounts" ON selected_ad_accounts;

CREATE POLICY "Agency admins can manage selected ad accounts"
ON selected_ad_accounts
FOR ALL
USING (is_agency_admin(agency_id))
WITH CHECK (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view selected ad accounts"
ON selected_ad_accounts
FOR SELECT
USING (user_belongs_to_agency(agency_id));

-- Create a function to automatically set agency_id and connection_id
CREATE OR REPLACE FUNCTION auto_set_ad_account_relations()
RETURNS TRIGGER AS $$
DECLARE
  user_agency_id UUID;
  user_connection_id UUID;
BEGIN
  -- Get user's agency
  user_agency_id := get_user_agency_id();
  
  -- Get user's active Facebook connection
  SELECT id INTO user_connection_id
  FROM facebook_connections
  WHERE user_id = auth.uid() 
    AND agency_id = user_agency_id 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Set the values
  NEW.agency_id := user_agency_id;
  NEW.connection_id := COALESCE(user_connection_id, NEW.connection_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;