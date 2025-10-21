-- Atualizar função para arquivar apenas posts publicados
CREATE OR REPLACE FUNCTION archive_old_approved_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Arquivar apenas posts publicados há mais de 7 dias
  UPDATE social_media_posts
  SET 
    archived = true,
    archived_at = now()
  WHERE 
    archived = false
    AND status = 'published'
    AND scheduled_date < (now() - interval '7 days')
  ;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log da operação
  RAISE NOTICE 'Arquivados % posts publicados', archived_count;
  
  RETURN archived_count;
END;
$$;