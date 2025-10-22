-- Criar tabela de tracking de notificações para deduplicação
CREATE TABLE IF NOT EXISTS public.notification_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  agency_id UUID NOT NULL,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_type, entity_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_tracking_lookup 
ON public.notification_tracking(notification_type, entity_id, user_id);

CREATE INDEX IF NOT EXISTS idx_notification_tracking_cleanup 
ON public.notification_tracking(last_sent_at);

-- RLS policies para notification_tracking
ALTER TABLE public.notification_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert tracking"
ON public.notification_tracking
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update tracking"
ON public.notification_tracking
FOR UPDATE
USING (true);

CREATE POLICY "Users can view their tracking"
ON public.notification_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Adicionar novas colunas em notification_preferences para cada tipo
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS tasks_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS posts_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payments_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS leads_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS meetings_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS do_not_disturb_until TIMESTAMPTZ;

-- Função para limpar tracking antigo (> 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_tracking()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notification_tracking
  WHERE last_sent_at < (now() - INTERVAL '30 days');
  
  RAISE NOTICE 'Cleaned up old notification tracking records';
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.notification_tracking IS 'Rastreia envio de notificações para evitar duplicatas';
COMMENT ON COLUMN public.notification_tracking.notification_type IS 'Tipo: task, post, payment, lead, meeting, reminder';
COMMENT ON COLUMN public.notification_tracking.entity_id IS 'ID da entidade relacionada (task_id, post_id, etc)';
COMMENT ON COLUMN public.notification_tracking.last_sent_at IS 'Última vez que notificação foi enviada';
COMMENT ON FUNCTION public.cleanup_old_notification_tracking IS 'Remove registros de tracking com mais de 30 dias';