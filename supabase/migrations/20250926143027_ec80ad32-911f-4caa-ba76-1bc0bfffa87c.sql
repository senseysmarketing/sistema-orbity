-- Add max_facebook_ad_accounts to subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN max_facebook_ad_accounts integer NOT NULL DEFAULT 10;

-- Update existing plans with proper limits
UPDATE public.subscription_plans 
SET max_facebook_ad_accounts = CASE 
  WHEN slug = 'basic' THEN 10
  WHEN slug = 'professional' OR slug = 'pro' THEN 30
  WHEN slug = 'enterprise' THEN 999999
  ELSE 10
END;

-- Create facebook_connections table
CREATE TABLE public.facebook_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  facebook_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  business_id TEXT,
  business_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, facebook_user_id)
);

-- Create selected_ad_accounts table
CREATE TABLE public.selected_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.facebook_connections(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  ad_account_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  timezone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, ad_account_id)
);

-- Create ad_account_metrics table for storing historical data
CREATE TABLE public.ad_account_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  ad_account_id TEXT NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  spend NUMERIC(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  cpm NUMERIC(8,4) DEFAULT 0,
  cpc NUMERIC(8,4) DEFAULT 0,
  ctr NUMERIC(8,4) DEFAULT 0,
  conversion_rate NUMERIC(8,4) DEFAULT 0,
  account_balance NUMERIC(12,2),
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ad_account_id, date_start, date_end)
);

-- Enable RLS
ALTER TABLE public.facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selected_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_account_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facebook_connections
CREATE POLICY "Agency admins can manage facebook connections"
ON public.facebook_connections
FOR ALL
USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view facebook connections"
ON public.facebook_connections
FOR SELECT
USING (user_belongs_to_agency(agency_id));

-- RLS Policies for selected_ad_accounts
CREATE POLICY "Agency admins can manage selected ad accounts"
ON public.selected_ad_accounts
FOR ALL
USING (is_agency_admin(agency_id));

CREATE POLICY "Agency members can view selected ad accounts"
ON public.selected_ad_accounts
FOR SELECT
USING (user_belongs_to_agency(agency_id));

-- RLS Policies for ad_account_metrics
CREATE POLICY "Agency members can view ad account metrics"
ON public.ad_account_metrics
FOR SELECT
USING (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency admins can manage ad account metrics"
ON public.ad_account_metrics
FOR ALL
USING (is_agency_admin(agency_id));

-- Add triggers for updated_at
CREATE TRIGGER update_facebook_connections_updated_at
BEFORE UPDATE ON public.facebook_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_selected_ad_accounts_updated_at
BEFORE UPDATE ON public.selected_ad_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_account_metrics_updated_at
BEFORE UPDATE ON public.ad_account_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();