-- Adicionar coluna is_system na tabela lead_statuses
ALTER TABLE public.lead_statuses 
ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Atualizar os status padrão existentes para marcá-los como system
UPDATE public.lead_statuses 
SET is_system = true 
WHERE is_default = true;