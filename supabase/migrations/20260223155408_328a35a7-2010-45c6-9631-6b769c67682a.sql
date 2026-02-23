-- Resetar posts em 'published' sem histórico de movimentação para 'draft'
-- Isso afeta 44 posts que foram criados diretamente como "Publicado" sem passar pelo workflow
UPDATE social_media_posts
SET status = 'draft', updated_at = now()
WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'
  AND status = 'published'
  AND (approval_history IS NULL OR approval_history::text = '[]');