-- Create system_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for system_config
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create master_system_logs table
CREATE TABLE IF NOT EXISTS public.master_system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    log_type TEXT NOT NULL, -- 'api', 'import', 'system', 'whatsapp'
    agency_id UUID REFERENCES public.agencies(id),
    status TEXT NOT NULL, -- 'success', 'error', 'info'
    description TEXT NOT NULL,
    details TEXT,
    metadata JSONB
);

-- Enable RLS for master_system_logs
ALTER TABLE public.master_system_logs ENABLE ROW LEVEL SECURITY;

-- Create views for SystemSecurity component
CREATE OR REPLACE VIEW public.master_users AS
SELECT 
    au.user_id,
    p.name,
    p.email,
    au.role,
    au.created_at as joined_at,
    p.updated_at as last_activity
FROM public.agency_users au
JOIN public.profiles p ON au.user_id = p.id
WHERE au.agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'; -- Master Agency ID

CREATE OR REPLACE VIEW public.master_facebook_connections AS
SELECT 
    fc.id,
    fc.agency_id,
    a.name as agency_name,
    fc.is_active,
    fc.updated_at as last_sync,
    fc.token_expires_at
FROM public.facebook_connections fc
JOIN public.agencies a ON fc.agency_id = a.id;

-- RLS Policies
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.agency_users 
            WHERE user_id = auth.uid() 
            AND agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'
            AND role IN ('owner', 'admin')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies if they exist to avoid errors on retry
DROP POLICY IF EXISTS "Master users can manage system config" ON public.system_config;
DROP POLICY IF EXISTS "Master users can view system logs" ON public.master_system_logs;

-- Apply policies
CREATE POLICY "Master users can manage system config" 
ON public.system_config 
FOR ALL 
USING (public.is_master_admin());

CREATE POLICY "Master users can view system logs" 
ON public.master_system_logs 
FOR SELECT 
USING (public.is_master_admin());

-- Insert default configurations
INSERT INTO public.system_config (key, value, description) VALUES
('trial_days', '14', 'Default duration for new agency trials'),
('trial_reminder_days', '[7, 3, 1]', 'Days before trial ends to send reminders'),
('features_enabled', '{"crm": true, "social_media": true, "traffic": true, "contracts": true}', 'Global feature flags'),
('max_api_logs_days', '30', 'Retention period for API audit logs'),
('maintenance_mode', 'false', 'Global maintenance mode toggle')
ON CONFLICT (key) DO NOTHING;

-- Cleanup system_settings if it exists and migrate WhatsApp config if present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
        INSERT INTO public.system_config (key, value, description)
        SELECT key, value::text, 'Migrated from system_settings'
        FROM public.system_settings
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
        
        DROP TABLE public.system_settings;
    END IF;
END $$;
