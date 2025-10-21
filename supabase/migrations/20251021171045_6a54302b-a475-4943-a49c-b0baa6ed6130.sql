-- Adicionar colunas de arquivamento na tabela social_media_posts
ALTER TABLE social_media_posts 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Criar índice para melhorar performance das consultas de arquivamento
CREATE INDEX IF NOT EXISTS idx_social_media_posts_archived 
ON social_media_posts(archived, archived_at);

CREATE INDEX IF NOT EXISTS idx_social_media_posts_status_scheduled 
ON social_media_posts(status, scheduled_date);

-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar função para arquivar posts antigos aprovados
CREATE OR REPLACE FUNCTION archive_old_approved_posts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  archived_count integer;
BEGIN
  -- Arquivar posts aprovados ou publicados há mais de 7 dias
  UPDATE social_media_posts
  SET 
    archived = true,
    archived_at = now()
  WHERE 
    archived = false
    AND status IN ('approved', 'published')
    AND scheduled_date < (now() - interval '7 days')
  ;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log da operação
  RAISE NOTICE 'Arquivados % posts', archived_count;
  
  RETURN archived_count;
END;
$$;

-- Agendar execução diária da função de arquivamento (às 3h da manhã)
SELECT cron.schedule(
  'archive-old-social-media-posts',
  '0 3 * * *',
  $$
  SELECT archive_old_approved_posts();
  $$
);