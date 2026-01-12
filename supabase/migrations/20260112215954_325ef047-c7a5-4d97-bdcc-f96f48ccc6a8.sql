-- Atualizar Price IDs para produção
UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1Sot6oCLXDdhG50onSqTnssZ'
WHERE slug = 'basic';

UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1Sot7NCLXDdhG50oMJayHaml'
WHERE slug = 'professional';

UPDATE subscription_plans 
SET stripe_price_id_monthly = 'price_1Sot7qCLXDdhG50oSHnq17Ny'
WHERE slug = 'enterprise';