-- Insert initial configuration for WhatsApp and Trial
INSERT INTO public.system_config (key, value, description)
VALUES 
    ('trial_settings', '{"days": 7, "message_template": "Olá {name}! Seu período de teste na Orbity começou. Você tem {days} dias para explorar todas as funcionalidades.", "reminders": [{"days_before": 2, "message": "Olá {name}! Seu trial expira em 2 dias."}, {"days_before": 1, "message": "Olá {name}! Seu trial expira amanhã."}]}', 'Configurações de Trial e mensagens'),
    ('whatsapp_verification_template', '"Para finalizar seu acesso à Orbity, use o código: {code}"', 'Template da mensagem de verificação via WhatsApp')
ON CONFLICT (key) DO NOTHING;

-- Ensure RLS is enabled and master users can manage it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'system_config' 
        AND policyname = 'Master users can manage system_config'
    ) THEN
        CREATE POLICY "Master users can manage system_config"
        ON public.system_config
        FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.master_users
                WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;
