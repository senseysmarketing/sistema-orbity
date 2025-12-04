-- Add description field to client_payments for extra services
ALTER TABLE public.client_payments 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN public.client_payments.description IS 'Descrição opcional para pagamentos extras ou serviços adicionais';