
-- Clean up ghost messages created by messages.update bug
DELETE FROM public.whatsapp_messages WHERE conversation_id = '77e1005b-0d85-42a0-8afd-c761476a48dc';

-- Clean up the ghost conversation with empty phone_number
DELETE FROM public.whatsapp_conversations WHERE id = '77e1005b-0d85-42a0-8afd-c761476a48dc';

-- Also clean up any other conversations with empty/null phone numbers
DELETE FROM public.whatsapp_messages WHERE conversation_id IN (
  SELECT id FROM public.whatsapp_conversations WHERE phone_number IS NULL OR phone_number = '' OR length(phone_number) < 5
);
DELETE FROM public.whatsapp_conversations WHERE phone_number IS NULL OR phone_number = '' OR length(phone_number) < 5;
