-- Desativar tokens obsoletos do iPhone para o usuário, mantendo apenas o mais recente
UPDATE push_subscriptions 
SET is_active = false 
WHERE user_id = '03755812-224d-42d4-b651-bdbc09c323ad'
  AND device_info->>'platform' = 'iPhone'
  AND id != '211258a4-6812-491c-85d5-c42ecfeed948';