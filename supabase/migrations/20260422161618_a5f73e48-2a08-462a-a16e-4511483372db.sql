CREATE OR REPLACE FUNCTION public.get_user_agency_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) Priorizar agência com assinatura ativa/trial/past_due
  SELECT au.agency_id INTO v_agency_id
  FROM public.agency_users au
  JOIN public.agency_subscriptions s ON s.agency_id = au.agency_id
  WHERE au.user_id = v_user
    AND s.status IN ('active','trial','trialing','past_due')
  ORDER BY 
    CASE WHEN au.role IN ('owner','admin') THEN 0 ELSE 1 END,
    au.created_at ASC
  LIMIT 1;

  IF v_agency_id IS NOT NULL THEN
    RETURN v_agency_id;
  END IF;

  -- 2) Em empate, agência onde é owner/admin (mais antiga)
  SELECT agency_id INTO v_agency_id
  FROM public.agency_users
  WHERE user_id = v_user
    AND role IN ('owner','admin')
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_agency_id IS NOT NULL THEN
    RETURN v_agency_id;
  END IF;

  -- 3) Fallback: qualquer agência (mais antiga)
  SELECT agency_id INTO v_agency_id
  FROM public.agency_users
  WHERE user_id = v_user
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN v_agency_id;
END;
$function$;