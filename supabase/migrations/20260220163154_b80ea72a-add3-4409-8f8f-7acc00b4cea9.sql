-- Resetar posts cujo status UUID não existe em social_media_custom_statuses
UPDATE social_media_posts p
SET status = 'published'
WHERE 
  p.status NOT IN ('pending_approval', 'in_creation', 'revision', 'approved', 'scheduled', 'published')
  AND NOT EXISTS (
    SELECT 1 FROM social_media_custom_statuses cs 
    WHERE cs.id::text = p.status 
    AND cs.agency_id = p.agency_id
  );