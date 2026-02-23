
-- =====================================================
-- FASE 3: Migração de dados e limpeza
-- =====================================================

-- STEP 0: Remove triggers on post tables FIRST to avoid spurious notifications
DROP TRIGGER IF EXISTS on_post_assignment_created ON post_assignments;
DROP TRIGGER IF EXISTS on_post_updated ON social_media_posts;

-- STEP 1: Create temp mapping table
CREATE TEMP TABLE post_to_task_map (
  old_post_id UUID,
  new_task_id UUID
);

-- Migrate posts to tasks
DO $$
DECLARE
  post_rec RECORD;
  new_id UUID;
  mapped_priority text;
BEGIN
  FOR post_rec IN SELECT * FROM public.social_media_posts ORDER BY created_at
  LOOP
    -- Map priority safely
    mapped_priority := COALESCE(post_rec.priority, 'medium');
    IF mapped_priority NOT IN ('low', 'medium', 'high') THEN
      mapped_priority := 'medium';
    END IF;

    INSERT INTO public.tasks (
      title, description, status, priority, due_date, created_by, agency_id,
      created_at, archived, subtasks, attachments, notification_sent_at,
      task_type, platform, post_type, post_date, hashtags, creative_instructions
    ) VALUES (
      post_rec.title,
      CASE 
        WHEN post_rec.notes IS NOT NULL AND post_rec.notes != '' AND post_rec.description IS NOT NULL AND post_rec.description != ''
          THEN post_rec.description || E'\n\n---\nNotas: ' || post_rec.notes
        WHEN post_rec.notes IS NOT NULL AND post_rec.notes != '' 
          THEN post_rec.notes
        ELSE post_rec.description
      END,
      CASE post_rec.status
        WHEN 'draft' THEN 'todo'
        WHEN 'in_creation' THEN 'in_progress'
        WHEN 'criados' THEN 'in_progress'
        WHEN 'pending_approval' THEN 'review'
        WHEN 'aguardando_cliente_aprovar' THEN 'review'
        WHEN 'approved' THEN 'review'
        WHEN 'scheduled' THEN 'review'
        WHEN 'published' THEN 'completed'
        ELSE 'todo'
      END,
      mapped_priority::task_priority,
      COALESCE(post_rec.due_date, post_rec.scheduled_date::date),
      post_rec.created_by,
      post_rec.agency_id,
      post_rec.created_at,
      COALESCE(post_rec.archived, false),
      post_rec.subtasks,
      post_rec.attachments,
      post_rec.notification_sent_at,
      'redes_sociais',
      post_rec.platform,
      post_rec.post_type,
      post_rec.post_date,
      post_rec.hashtags,
      post_rec.creative_instructions
    )
    RETURNING id INTO new_id;

    INSERT INTO post_to_task_map (old_post_id, new_task_id) VALUES (post_rec.id, new_id);

    -- Migrate client_id to task_clients junction table
    IF post_rec.client_id IS NOT NULL THEN
      INSERT INTO public.task_clients (task_id, client_id)
      VALUES (new_id, post_rec.client_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- STEP 2: Migrate post_assignments to task_assignments
INSERT INTO public.task_assignments (task_id, user_id, assigned_by, assigned_at)
SELECT 
  m.new_task_id,
  pa.user_id,
  pa.assigned_by,
  pa.assigned_at
FROM public.post_assignments pa
JOIN post_to_task_map m ON m.old_post_id = pa.post_id
ON CONFLICT DO NOTHING;

-- STEP 3: Rename legacy tables to deprecated
ALTER TABLE public.social_media_posts RENAME TO social_media_posts_deprecated;
ALTER TABLE public.post_assignments RENAME TO post_assignments_deprecated;

-- STEP 4: Drop legacy database functions
DROP FUNCTION IF EXISTS public.notify_post_assignment() CASCADE;
DROP FUNCTION IF EXISTS public.notify_post_update_events() CASCADE;
DROP FUNCTION IF EXISTS public.apply_post_event_rules(uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.archive_old_approved_posts() CASCADE;

-- Clean up temp table
DROP TABLE IF EXISTS post_to_task_map;
