-- ============================================
-- FASE 1: Otimização do Sistema de Notificações
-- Adicionar colunas de status e índices otimizados
-- ============================================

-- 1. Adicionar colunas de controle de notificação
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE social_media_posts 
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS follow_up_notification_sent_at TIMESTAMP WITH TIME ZONE;

-- 2. Criar índices para performance nas queries de notificação

-- Índice para tasks pendentes de notificação
CREATE INDEX IF NOT EXISTS idx_tasks_notification_pending 
ON tasks(due_date, notification_sent_at, agency_id) 
WHERE status != 'done' AND archived = false;

-- Índice para posts pendentes de notificação
CREATE INDEX IF NOT EXISTS idx_posts_notification_pending 
ON social_media_posts(scheduled_date, notification_sent_at, agency_id) 
WHERE archived = false;

-- Índice para leads pendentes de notificação
CREATE INDEX IF NOT EXISTS idx_leads_notification_pending 
ON leads(last_contact, follow_up_notification_sent_at, agency_id, assigned_to) 
WHERE assigned_to IS NOT NULL;

-- 3. Otimizar índice da tabela notification_tracking

-- Índice composto para lookup rápido
CREATE INDEX IF NOT EXISTS idx_notification_tracking_lookup 
ON notification_tracking(notification_type, entity_id, user_id, last_sent_at);

-- Índice para limpeza automática de registros antigos
CREATE INDEX IF NOT EXISTS idx_notification_tracking_cleanup 
ON notification_tracking(last_sent_at);

-- 4. Comentários para documentação
COMMENT ON COLUMN tasks.notification_sent_at IS 'Timestamp da última notificação enviada para esta task';
COMMENT ON COLUMN social_media_posts.notification_sent_at IS 'Timestamp da última notificação enviada para este post';
COMMENT ON COLUMN leads.follow_up_notification_sent_at IS 'Timestamp da última notificação de follow-up enviada para este lead';