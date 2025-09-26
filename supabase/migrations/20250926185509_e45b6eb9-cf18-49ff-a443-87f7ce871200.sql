-- Atualizar o limite de contas de anúncios do plano Senseys para ilimitado
UPDATE subscription_plans 
SET max_facebook_ad_accounts = 999999,
    updated_at = now()
WHERE slug = 'senseys';