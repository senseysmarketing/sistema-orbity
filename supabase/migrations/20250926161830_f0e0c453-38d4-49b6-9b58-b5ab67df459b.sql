-- Create trigger to auto-set agency_id and connection_id
CREATE TRIGGER set_ad_account_relations
BEFORE INSERT OR UPDATE ON selected_ad_accounts
FOR EACH ROW
EXECUTE FUNCTION auto_set_ad_account_relations();

-- Fix search path for the function
ALTER FUNCTION auto_set_ad_account_relations() SET search_path = public;