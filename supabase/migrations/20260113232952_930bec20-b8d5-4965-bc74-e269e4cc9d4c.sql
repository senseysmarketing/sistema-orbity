-- View para usuários master (admins da Senseys) - CORRIGIDA
CREATE OR REPLACE VIEW public.master_users AS
SELECT 
  p.user_id,
  p.name,
  p.email,
  au.role,
  au.joined_at,
  au.updated_at as last_activity
FROM public.profiles p
JOIN public.agency_users au ON au.user_id = p.user_id
JOIN public.agencies a ON a.id = au.agency_id
WHERE a.slug = 'senseys'
  AND au.role IN ('owner', 'admin')
  AND public.is_master_agency_admin();