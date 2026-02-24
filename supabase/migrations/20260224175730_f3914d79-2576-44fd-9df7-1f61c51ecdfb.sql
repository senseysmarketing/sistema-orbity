UPDATE tasks
SET status = 'em_revisao'
WHERE status = 'review'
  AND task_type = 'redes_sociais';