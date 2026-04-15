
-- Atualizar Leads — avançar 75 dias
UPDATE public.leads
SET created_at = created_at + INTERVAL '75 days',
    updated_at = NOW()
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770';

-- Atualizar Tarefas — avançar 75 dias
UPDATE public.tasks
SET due_date = due_date + INTERVAL '75 days',
    updated_at = NOW()
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770';

-- Atualizar Reuniões — avançar 75 dias
UPDATE public.meetings
SET start_time = start_time + INTERVAL '75 days',
    end_time = end_time + INTERVAL '75 days',
    updated_at = NOW()
WHERE agency_id = '546ccfe0-6fd5-4e57-840b-c7781383d770';
