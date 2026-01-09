-- Remover status duplicados (mantendo apenas os padrão corretos)
DELETE FROM task_statuses 
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770'
AND slug IN ('a-fazer', 'em-andamento', 'em-revisao', 'concluida');

-- Corrigir status das tarefas demo para usar slugs corretos
UPDATE tasks 
SET status = 'todo'
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND status = 'A Fazer';

UPDATE tasks 
SET status = 'in_progress'
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND status = 'Em Andamento';

UPDATE tasks 
SET status = 'em_revisao'
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND status = 'Em Revisão';

UPDATE tasks 
SET status = 'done'
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770' 
AND status = 'Concluída';