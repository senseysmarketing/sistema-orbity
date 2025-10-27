-- Adicionar coluna is_active na tabela lead_statuses
ALTER TABLE public.lead_statuses
ADD COLUMN is_active boolean NOT NULL DEFAULT true;