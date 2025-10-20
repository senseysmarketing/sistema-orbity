-- Atualizar limites de clientes e contas de anúncios nos planos
UPDATE subscription_plans 
SET 
  max_clients = 10,
  max_facebook_ad_accounts = 10
WHERE slug = 'basic';

UPDATE subscription_plans 
SET 
  max_clients = 30,
  max_facebook_ad_accounts = 30
WHERE slug = 'professional';

UPDATE subscription_plans 
SET 
  max_clients = 999999,
  max_facebook_ad_accounts = 999999
WHERE slug = 'enterprise';