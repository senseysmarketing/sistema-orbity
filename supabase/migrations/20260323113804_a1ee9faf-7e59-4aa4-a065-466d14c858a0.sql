-- Fix the WhatsApp account status from 'connecting' to 'connected'
UPDATE whatsapp_accounts SET status = 'connected' WHERE id = 'a89cf7ee-fe68-487a-b6b1-15a9272012a3' AND status = 'connecting';