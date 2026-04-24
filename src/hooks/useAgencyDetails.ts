import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AgencyDetailsAgency {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  public_email: string | null;
  public_phone: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  brand_theme: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  onboarding_completed_at: string | null;
  max_users: number;
  max_clients: number;
  max_leads: number;
  max_tasks: number;
  monthly_value: number | null;
}

export interface AgencyDetailsSubscription {
  id: string;
  status: string;
  billing_cycle: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_date: string | null;
  last_payment_date: string | null;
  canceled_at: string | null;
  auto_renew: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_name: string | null;
  plan_slug: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
}

export interface AgencyDetailsMember {
  user_id: string;
  role: string;
  custom_role: string | null;
  joined_at: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
}

export interface AgencyDetailsBilling {
  id: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  invoice_url: string | null;
  stripe_invoice_id: string | null;
  created_at: string;
}

export interface AgencyDetailsActivity {
  total_clients: number;
  active_clients: number;
  total_leads: number;
  leads_last_7d: number;
  leads_last_30d: number;
  total_tasks: number;
  tasks_last_7d: number;
  tasks_completed_30d: number;
  total_meetings: number;
  meetings_last_30d: number;
  total_payments: number;
  payments_paid_30d: number;
  revenue_30d: number;
  last_login_at: string | null;
  last_activity_at: string | null;
}

export interface AgencyDetailsData {
  agency: AgencyDetailsAgency;
  subscription: AgencyDetailsSubscription | null;
  members: AgencyDetailsMember[];
  billing_history: AgencyDetailsBilling[];
  activity: AgencyDetailsActivity;
}

export function useAgencyDetails(agencyId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['master-agency-details', agencyId],
    enabled: !!agencyId && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<AgencyDetailsData> => {
      const { data, error } = await supabase.rpc('master_get_agency_details' as any, {
        p_agency_id: agencyId,
      });
      if (error) throw error;
      return data as unknown as AgencyDetailsData;
    },
  });
}
