ALTER TABLE public.nps_settings
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_template text DEFAULT 'Olá {{client_name}}! 👋

Gostaríamos de saber como está a nossa parceria. Avalie-nos em 30 segundos:

🔗 {{nps_link}}

Sua opinião é muito importante! 💙',
  ADD COLUMN IF NOT EXISTS survey_title text DEFAULT 'Olá, {{client_name}}!',
  ADD COLUMN IF NOT EXISTS survey_message text DEFAULT 'Como está nossa parceria?',
  ADD COLUMN IF NOT EXISTS main_question text DEFAULT 'De 0 a 10, o quanto você recomendaria nossos serviços?',
  ADD COLUMN IF NOT EXISTS feedback_label_promoter text DEFAULT 'Ficamos muito felizes! O que mais gostou?',
  ADD COLUMN IF NOT EXISTS feedback_label_neutral text DEFAULT 'Obrigado! O que faltou para a nota ser 10?',
  ADD COLUMN IF NOT EXISTS feedback_label_detractor text DEFAULT 'Sentimos muito por isso. O que podemos fazer IMEDIATAMENTE para resolver o seu problema?';

-- GUARDRAIL 1: Política RESTRITIVA — só lê settings se existir token não-usado da mesma agência
CREATE POLICY "Public read nps settings via token" ON public.nps_settings
  FOR SELECT TO anon 
  USING (EXISTS (SELECT 1 FROM public.nps_tokens t WHERE t.agency_id = nps_settings.agency_id AND t.is_used = false));