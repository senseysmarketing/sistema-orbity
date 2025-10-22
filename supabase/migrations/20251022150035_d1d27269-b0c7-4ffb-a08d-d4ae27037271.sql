-- Drop antiga tabela personal_tasks
DROP TABLE IF EXISTS personal_tasks CASCADE;

-- Criar tabela reminder_lists
CREATE TABLE public.reminder_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'bg-blue-500',
  icon TEXT NOT NULL DEFAULT '📋',
  order_position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar enum para tipo de recorrência
CREATE TYPE recurrence_type AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom');

-- Criar enum para prioridade
CREATE TYPE reminder_priority AS ENUM ('none', 'low', 'medium', 'high');

-- Criar tabela reminders (nova versão de personal_tasks)
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agency_id UUID REFERENCES public.agencies(id),
  list_id UUID REFERENCES public.reminder_lists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  notes TEXT,
  reminder_time TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Recurrence fields
  recurrence_type recurrence_type NOT NULL DEFAULT 'none',
  recurrence_interval INTEGER DEFAULT 1,
  recurrence_days_of_week INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  recurrence_end_date DATE,
  recurrence_count INTEGER,
  parent_reminder_id UUID REFERENCES public.reminders(id) ON DELETE CASCADE,
  
  -- Notification fields
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_minutes_before INTEGER DEFAULT 0,
  notification_sound TEXT DEFAULT 'default',
  last_notification_sent TIMESTAMP WITH TIME ZONE,
  
  -- Organization fields
  priority reminder_priority NOT NULL DEFAULT 'none',
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  subtasks JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reminder_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Policies for reminder_lists
CREATE POLICY "Users can view own reminder lists"
  ON public.reminder_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminder lists"
  ON public.reminder_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminder lists"
  ON public.reminder_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminder lists"
  ON public.reminder_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for reminders
CREATE POLICY "Users can view own reminders"
  ON public.reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON public.reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_reminder_lists_updated_at
  BEFORE UPDATE ON public.reminder_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_reminders_user_id ON public.reminders(user_id);
CREATE INDEX idx_reminders_list_id ON public.reminders(list_id);
CREATE INDEX idx_reminders_reminder_time ON public.reminders(reminder_time);
CREATE INDEX idx_reminders_completed ON public.reminders(completed);
CREATE INDEX idx_reminder_lists_user_id ON public.reminder_lists(user_id);

-- Enable realtime for reminders
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminder_lists;