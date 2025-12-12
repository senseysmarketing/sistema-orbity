-- Atualizar política de DELETE para tasks: apenas criador ou admin pode excluir
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Agency admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Creators and admins can delete tasks" ON tasks;

CREATE POLICY "Creators and admins can delete tasks"
ON tasks FOR DELETE
USING (
  created_by = auth.uid() 
  OR public.is_agency_admin(agency_id)
);

-- Atualizar política de DELETE para social_media_posts: apenas criador ou admin pode excluir
DROP POLICY IF EXISTS "Users can delete posts" ON social_media_posts;
DROP POLICY IF EXISTS "Agency admins can delete posts" ON social_media_posts;
DROP POLICY IF EXISTS "Creators and admins can delete posts" ON social_media_posts;

CREATE POLICY "Creators and admins can delete posts"
ON social_media_posts FOR DELETE
USING (
  created_by = auth.uid() 
  OR public.is_agency_admin(agency_id)
);