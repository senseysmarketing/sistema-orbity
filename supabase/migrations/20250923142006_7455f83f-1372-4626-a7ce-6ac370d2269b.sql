-- Add archived field to tasks table
ALTER TABLE public.tasks 
ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering archived tasks
CREATE INDEX idx_tasks_archived ON public.tasks(archived);