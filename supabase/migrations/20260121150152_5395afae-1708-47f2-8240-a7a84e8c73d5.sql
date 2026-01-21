-- Corrigir leads com status vazio ou nulo (incluindo "Fabiano Leão")
UPDATE leads SET status = 'leads' WHERE status = '' OR status IS NULL;

-- Corrigir status em português para inglês
UPDATE leads SET status = 'proposal' WHERE LOWER(status) = 'propostas';
UPDATE leads SET status = 'lost' WHERE LOWER(status) = 'perdido';