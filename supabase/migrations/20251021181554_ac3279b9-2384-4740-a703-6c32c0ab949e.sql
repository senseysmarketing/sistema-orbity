-- Add history field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb;