import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { toast } from 'sonner';
import { isMasterAgencyAdmin } from '@/lib/masterAccess';

type ComputedStatus = 'active' | 'trialing' | 'trial_expired' | 'past_due' | 'canceled' | 'suspended' | 'unknown';

interface MasterAgencyOverview {
  agency_id: string;
  agency_name: string;
  created_at: string;
  is_active: boolean;
  user_count: number;
  client_count: number;
  task_count: number;
  total_revenue: number;
  plan_name: string;
  plan_slug: string;
  subscription_status: string;
  current_period_end: string;
  trial_end: string | null;
  computed_status: ComputedStatus;
  billing_cycle: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  monthly_value: number | null;
}

interface BillingMetrics {
  total_payments: number;
  total_revenue_received: number;
  payments_this_month: number;
  revenue_this_month: number;
}

interface StatusCounts {
  active: number;
  trialing: number;
  trial_expired: number;
  past_due: number;
  canceled: number;
  suspended: number;
}

interface MasterContextType {
  isMasterUser: boolean;
  agencies: MasterAgencyOverview[];
  loading: boolean;
  refreshAgencies: () => Promise<void>;
  suspendAgency: (agencyId: string) => Promise<void>;
  reactivateAgency: (agencyId: string) => Promise<void>;
  getMasterMetrics: () => {
    totalAgencies: number;
    activeAgencies: number;
    mrr: number;
    totalUsers: number;
    totalPayments: number;
  };
  getStatusCounts: () => StatusCounts;
}

const MasterContext = createContext<MasterContextType | undefined>(undefined);

export function MasterProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentAgency, agencyRole } = useAgency();
  const [agencies, setAgencies] = useState<MasterAgencyOverview[]>([]);
  const [billingMetrics, setBillingMetrics] = useState<BillingMetrics>({
    total_payments: 0,
    total_revenue_received: 0,
    payments_this_month: 0,
    revenue_this_month: 0,
  });
  const [loading, setLoading] = useState(true);

  // Verificar se é admin/owner da agência Senseys (master)
  const isMasterUser = isMasterAgencyAdmin(currentAgency?.id, agencyRole);

  const fetchAgencies = async () => {
    if (!isMasterUser) {
      setLoading(false);
      return;
    }

    try {
      // Fetch agencies and billing metrics in parallel
      const [agenciesResult, billingResult] = await Promise.all([
        supabase.from('master_agency_overview').select('*'),
        supabase.from('master_billing_metrics').select('*').single(),
      ]);

      if (agenciesResult.error) throw agenciesResult.error;
      setAgencies((agenciesResult.data || []) as unknown as MasterAgencyOverview[]);

      if (billingResult.data) {
        setBillingMetrics(billingResult.data as BillingMetrics);
      }
    } catch (error) {
      console.error('Error fetching agencies:', error);
      toast.error('Erro ao carregar dados das agências');
    } finally {
      setLoading(false);
    }
  };

  const refreshAgencies = async () => {
    await fetchAgencies();
  };

  const suspendAgency = async (agencyId: string) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ is_active: false })
        .eq('id', agencyId);

      if (error) throw error;
      
      toast.success('Agência suspensa com sucesso');
      await refreshAgencies();
    } catch (error) {
      console.error('Error suspending agency:', error);
      toast.error('Erro ao suspender agência');
    }
  };

  const reactivateAgency = async (agencyId: string) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ is_active: true })
        .eq('id', agencyId);

      if (error) throw error;
      
      toast.success('Agência reativada com sucesso');
      await refreshAgencies();
    } catch (error) {
      console.error('Error reactivating agency:', error);
      toast.error('Erro ao reativar agência');
    }
  };

  const getMasterMetrics = () => {
    const totalAgencies = agencies.length;
    const activeAgencies = agencies.filter(a => a.computed_status === 'active').length;
    const totalUsers = agencies.reduce((sum, a) => sum + a.user_count, 0);
    
    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = agencies
      .filter(a => a.computed_status === 'active')
      .reduce((sum, a) => {
        if (a.billing_cycle === 'yearly' && a.price_yearly) {
          return sum + (a.price_yearly / 12);
        } else if (a.price_monthly) {
          return sum + a.price_monthly;
        }
        return sum;
      }, 0);

    return {
      totalAgencies,
      activeAgencies,
      mrr,
      totalUsers,
      totalPayments: billingMetrics.total_payments,
    };
  };

  const getStatusCounts = (): StatusCounts => {
    return {
      active: agencies.filter(a => a.computed_status === 'active').length,
      trialing: agencies.filter(a => a.computed_status === 'trialing').length,
      trial_expired: agencies.filter(a => a.computed_status === 'trial_expired').length,
      past_due: agencies.filter(a => a.computed_status === 'past_due').length,
      canceled: agencies.filter(a => a.computed_status === 'canceled').length,
      suspended: agencies.filter(a => a.computed_status === 'suspended').length,
    };
  };

  useEffect(() => {
    if (user) {
      fetchAgencies();
    } else {
      setAgencies([]);
      setLoading(false);
    }
  }, [user, isMasterUser]);

  return (
    <MasterContext.Provider
      value={{
        isMasterUser,
        agencies,
        loading,
        refreshAgencies,
        suspendAgency,
        reactivateAgency,
        getMasterMetrics,
        getStatusCounts,
      }}
    >
      {children}
    </MasterContext.Provider>
  );
}

export function useMaster() {
  const context = useContext(MasterContext);
  if (context === undefined) {
    throw new Error('useMaster must be used within a MasterProvider');
  }
  return context;
}