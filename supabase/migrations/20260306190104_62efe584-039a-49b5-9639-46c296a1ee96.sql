-- Clean up stale duplicate integration row (specific form_id that shouldn't exist alongside 'all')
DELETE FROM facebook_lead_integrations 
WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0' 
  AND form_id = '2159046854900521';