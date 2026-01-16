-- Bucket para anexos de tasks
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket para anexos de posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-attachments', 'post-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para task-attachments
CREATE POLICY "Users can upload task attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view task attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Users can delete own task attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

-- RLS policies para post-attachments
CREATE POLICY "Users can upload post attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view post attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-attachments');

CREATE POLICY "Users can delete own post attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-attachments' AND auth.role() = 'authenticated');

-- Adicionar coluna de anexos na tabela tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';