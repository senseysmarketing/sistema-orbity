-- Corrigir função auto_set_ad_account_relations: buscar conexão pela AGÊNCIA, não pelo usuário
-- Problema: quando um usuário diferente do que criou a conexão tenta salvar contas, o trigger não encontrava a conexão
-- Solução: remover filtro por user_id, usar apenas agency_id

CREATE OR REPLACE FUNCTION public.auto_set_ad_account_relations()
RETURNS TRIGGER AS $$
DECLARE
  user_agency_id UUID;
  agency_connection_id UUID;
BEGIN
  -- Only set values from user context if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    user_agency_id := get_user_agency_id();
    
    IF user_agency_id IS NOT NULL THEN
      -- CORREÇÃO: Buscar conexão pela AGÊNCIA, não pelo usuário individual
      -- Isso permite que qualquer usuário da agência use a conexão do Facebook
      SELECT id INTO agency_connection_id
      FROM facebook_connections
      WHERE agency_id = user_agency_id
        AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1;
      
      -- Only override agency_id from user context
      NEW.agency_id := user_agency_id;
      -- Use the agency's connection, fallback to provided value
      NEW.connection_id := COALESCE(agency_connection_id, NEW.connection_id);
    END IF;
  END IF;
  
  -- For UPDATE operations from service role, preserve existing values
  IF TG_OP = 'UPDATE' THEN
    NEW.agency_id := COALESCE(NEW.agency_id, OLD.agency_id);
    NEW.connection_id := COALESCE(NEW.connection_id, OLD.connection_id);
  END IF;
  
  -- For INSERT, ensure agency_id is provided
  IF TG_OP = 'INSERT' AND NEW.agency_id IS NULL THEN
    RAISE EXCEPTION 'agency_id is required for new ad account records';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;