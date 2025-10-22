-- Add max_contracts column to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_contracts integer NOT NULL DEFAULT 10;

-- Update existing plans with appropriate values
-- Basic plan
UPDATE subscription_plans 
SET max_contracts = 10, 
    max_users = 5, 
    max_clients = 10, 
    max_leads = 300, 
    max_tasks = 500,
    price_monthly = 97
WHERE slug = 'basic';

-- Professional plan  
UPDATE subscription_plans 
SET max_contracts = 30,
    max_users = 10,
    max_clients = 30,
    max_leads = 500,
    max_tasks = 800,
    price_monthly = 197
WHERE slug = 'professional';

-- Enterprise plan
UPDATE subscription_plans
SET max_contracts = 999999,
    max_users = 999999,
    max_clients = 999999,
    max_leads = 999999,
    max_tasks = 999999,
    price_monthly = 597
WHERE slug = 'enterprise';