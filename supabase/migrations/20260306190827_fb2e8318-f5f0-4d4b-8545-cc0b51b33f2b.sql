INSERT INTO facebook_lead_integrations (
  agency_id, connection_id, page_id, page_name, form_id, form_name,
  default_status, default_priority, created_by, pixel_id
) VALUES (
  '7bef1258-af3d-48cc-b3a7-f79fac29c7c0',
  'e869411c-3fc8-490b-a003-899cc0fb1ab2',
  '122105651264000613',
  'Senseys - Marketing de Performance',
  '2159046854900521',
  '[Senseys] 2026 V6',
  'new',
  'medium',
  '03755812-224d-42d4-b651-bdbc09c323ad',
  '25505012615814002'
) ON CONFLICT (agency_id, form_id) DO NOTHING;