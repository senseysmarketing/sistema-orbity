-- Add subtasks column to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Add subtasks column to social_media_posts table
ALTER TABLE public.social_media_posts
ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain subtasks structure
COMMENT ON COLUMN public.tasks.subtasks IS 'Array of subtask objects with structure: [{id: string, title: string, completed: boolean}]';
COMMENT ON COLUMN public.social_media_posts.subtasks IS 'Array of subtask objects with structure: [{id: string, title: string, completed: boolean}]';