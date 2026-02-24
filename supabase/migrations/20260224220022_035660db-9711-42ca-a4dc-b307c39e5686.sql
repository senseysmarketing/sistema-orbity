-- Atualizar o tipo na tabela task_types
UPDATE task_types
SET slug = 'trafego', name = 'Tráfego', icon = '📈'
WHERE slug = 'conteudo';

-- Atualizar tarefas que usam o slug antigo
UPDATE tasks
SET task_type = 'trafego'
WHERE task_type = 'conteudo';