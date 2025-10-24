-- Add personalized notification period configurations
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS reminder_advance_minutes INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS task_advance_hours INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS post_advance_hours INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS payment_advance_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS payment_repeat_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_repeat_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS lead_inactive_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS meeting_advance_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS expense_advance_days INTEGER DEFAULT 3;

-- Add Do Not Disturb configurations
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS dnd_start_time TIME,
ADD COLUMN IF NOT EXISTS dnd_end_time TIME,
ADD COLUMN IF NOT EXISTS dnd_weekends BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dnd_holidays BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT TRUE;

-- Add expense notifications support
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS expenses_enabled BOOLEAN DEFAULT TRUE;

-- Add notification_sent_at to expenses table for tracking
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP WITH TIME ZONE;