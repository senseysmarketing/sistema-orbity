import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface MasterAgencyOverview {
  agency_id: string;
  agency_name: string;
  created_at: string;
  is_active: boolean;
  user_count: number;
  client_count: number;
  task_count: number;
  total_revenue: number;
  subscription_plan: string;
  subscription_status: string;
  current_period_end: string;
  stripe_customer_id: string;
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
    totalRevenue: number;
    totalUsers: number;
    totalClients: number;
  };
}

const MasterContext = createContext<MasterContextType | undefined>(undefined);

export function MasterProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [agencies, setAgencies] = useState<MasterAgencyOverview[]>([]);
  const [loading, setLoading] = useState(true);

  const isMasterUser = profile?.role === 'administrador';

  const fetchAgencies = async () => {
    if (!isMasterUser) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('master_agency_overview')
        .select('*');

      if (error) throw error;
      setAgencies(data || []);
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
    const activeAgencies = agencies.filter(a => a.is_active).length;
    const totalRevenue = agencies.reduce((sum, a) => sum + Number(a.total_revenue), 0);
    const totalUsers = agencies.reduce((sum, a) => sum + a.user_count, 0);
    const totalClients = agencies.reduce((sum, a) => sum + a.client_count, 0);

    return {
      totalAgencies,
      activeAgencies,
      totalRevenue,
      totalUsers,
      totalClients,
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