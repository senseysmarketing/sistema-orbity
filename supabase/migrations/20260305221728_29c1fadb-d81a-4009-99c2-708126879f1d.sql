
-- 1. Unique constraint on whatsapp_conversations to prevent duplicate conversations
ALTER TABLE public.whatsapp_conversations 
ADD CONSTRAINT whatsapp_conversations_account_phone_unique 
UNIQUE (account_id, phone_number);

-- 2. Add retry_count and last_error to whatsapp_automation_control
ALTER TABLE public.whatsapp_automation_control 
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error text;

-- 3. Create whatsapp_automation_logs table for persistent audit trail
CREATE TABLE public.whatsapp_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.whatsapp_automation_control(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.whatsapp_accounts(id) ON DELETE CASCADE,
  event text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_automation_logs_automation_id ON public.whatsapp_automation_logs(automation_id);
CREATE INDEX idx_whatsapp_automation_logs_account_id ON public.whatsapp_automation_logs(account_id);
CREATE INDEX idx_whatsapp_automation_logs_created_at ON public.whatsapp_automation_logs(created_at);

-- RLS for logs table
ALTER TABLE public.whatsapp_automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs from their agency accounts"
ON public.whatsapp_automation_logs FOR SELECT
TO authenticated
USING (
  account_id IN (
    SELECT wa.id FROM public.whatsapp_accounts wa
    WHERE wa.agency_id IN (
      SELECT agency_id FROM public.agency_users WHERE user_id = auth.uid()
    )
  )
);

-- 4. Add CHECK constraint on whatsapp_automation_control.status
-- First, update any unexpected values
UPDATE public.whatsapp_automation_control 
SET status = 'finished' 
WHERE status NOT IN ('active', 'processing', 'paused', 'responded', 'finished');

ALTER TABLE public.whatsapp_automation_control 
ADD CONSTRAINT whatsapp_automation_control_status_check 
CHECK (status IN ('active', 'processing', 'paused', 'responded', 'finished'));

-- 5. Validation trigger for status transitions
CREATE OR REPLACE FUNCTION public.validate_automation_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow any transition on INSERT
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Block transitions FROM finished to active/processing (prevent zombie automations)
  IF OLD.status = 'finished' AND NEW.status IN ('active', 'processing') THEN
    RAISE EXCEPTION 'Invalid status transition: finished -> %', NEW.status;
  END IF;
  
  -- Block transitions FROM responded to active (must create new automation)
  IF OLD.status = 'responded' AND NEW.status = 'active' THEN
    RAISE EXCEPTION 'Invalid status transition: responded -> active';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_automation_status
BEFORE UPDATE ON public.whatsapp_automation_control
FOR EACH ROW
EXECUTE FUNCTION public.validate_automation_status_transition();
