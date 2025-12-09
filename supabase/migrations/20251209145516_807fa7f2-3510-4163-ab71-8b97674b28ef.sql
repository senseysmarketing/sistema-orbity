-- Passo 1: Criar uma coluna temporária TEXT
ALTER TABLE public.tasks ADD COLUMN status_new TEXT;

-- Passo 2: Copiar os valores convertendo para TEXT
UPDATE public.tasks SET status_new = status::TEXT;

-- Passo 3: Remover a coluna antiga
ALTER TABLE public.tasks DROP COLUMN status;

-- Passo 4: Renomear a nova coluna
ALTER TABLE public.tasks RENAME COLUMN status_new TO status;

-- Passo 5: Definir NOT NULL e valor padrão
ALTER TABLE public.tasks ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'todo';