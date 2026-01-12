-- Corrigir integrações existentes com valores de prioridade inválidos
UPDATE facebook_lead_integrations 
SET default_priority = 'warm' 
WHERE default_priority = 'medium';

UPDATE facebook_lead_integrations 
SET default_priority = 'cold' 
WHERE default_priority = 'low';

UPDATE facebook_lead_integrations 
SET default_priority = 'hot' 
WHERE default_priority = 'high';

-- Garantir que todas as integrações tenham valores válidos
UPDATE facebook_lead_integrations 
SET default_priority = 'cold' 
WHERE default_priority NOT IN ('cold', 'warm', 'hot');