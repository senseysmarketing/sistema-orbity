-- Verificar e corrigir a foreign key constraint da tabela tasks
-- O problema é que assigned_to deve referenciar profiles.user_id, não auth.users.id

-- Primeiro, remover a constraint existente se ela existe
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Adicionar a constraint correta para referenciar profiles.user_id
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES public.profiles(user_id) ON DELETE SET NULL;