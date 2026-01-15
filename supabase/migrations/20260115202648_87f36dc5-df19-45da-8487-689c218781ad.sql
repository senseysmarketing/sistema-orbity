-- Remover o trigger que bloqueia inserção de leads
DROP TRIGGER IF EXISTS on_lead_created ON leads;

-- Remover a função problemática
DROP FUNCTION IF EXISTS notify_new_lead();