-- 1) Garantir que o trigger não sobrescreva agency_id se já vier definido
CREATE OR REPLACE FUNCTION public.auto_set_ad_account_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas preencher agency_id se NÃO foi enviado explicitamente pelo app
  IF NEW.agency_id IS NULL THEN
    NEW.agency_id := public.get_user_agency_id();
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Permitir que membros da agência (não apenas admins) deletem contas
DROP POLICY IF EXISTS "Agency admins can manage selected ad accounts" ON public.selected_ad_accounts;
DROP POLICY IF EXISTS "Agency members can delete selected ad accounts" ON public.selected_ad_accounts;

CREATE POLICY "Agency members can delete selected ad accounts"
ON public.selected_ad_accounts
FOR DELETE
TO authenticated
USING (public.user_belongs_to_agency(agency_id));