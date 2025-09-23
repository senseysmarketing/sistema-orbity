-- Criar política para permitir que usuários autenticados vejam todos os perfis
-- Isso é necessário para que qualquer usuário possa ver quem pode ser responsável por uma tarefa
CREATE POLICY "Authenticated users can view all profiles for task assignment" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);