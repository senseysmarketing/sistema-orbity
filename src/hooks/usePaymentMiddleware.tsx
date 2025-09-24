import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaymentStatus {
  isValid: boolean;
  isBlocked: boolean;
  reason?: string;
  trialEnd?: string;
  subscriptionEnd?: string;
}

interface PlanLimits {
  users: number;
  clients: number;
  leads: number;
  tasks: number;
  storage: number;
}

interface UsageCounts {
  users: number;
  clients: number;
  leads: number;
  tasks: number;
  storage: number;
}

interface PaymentMiddlewareContextType {
  paymentStatus: PaymentStatus;
  planLimits: PlanLimits;
  usageCounts: UsageCounts;
  loading: boolean;
  isSuperAdmin: boolean;
  isAgencyAdmin: boolean;
  refreshPaymentStatus: () => Promise<void>;
  checkLimit: (type: keyof PlanLimits, newCount?: number) => boolean;
  enforceLimit: (type: keyof PlanLimits, action: string) => boolean;
  getUsagePercentage: (type: keyof PlanLimits) => number;
}

const PaymentMiddlewareContext = createContext<PaymentMiddlewareContextType | undefined>(undefined);

export function PaymentMiddlewareProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { currentAgency } = useAgency();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isValid: true,
    isBlocked: false
  });
  const [planLimits, setPlanLimits] = useState<PlanLimits>({
    users: 0,
    clients: 0,
    leads: 0,
    tasks: 0,
    storage: 0
  });
  const [usageCounts, setUsageCounts] = useState<UsageCounts>({
    users: 0,
    clients: 0,
    leads: 0,
    tasks: 0,
    storage: 0
  });
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAgencyAdmin = profile?.role === 'agency_admin' || profile?.role === 'administrador';

  const checkPaymentStatus = async () => {
    if (!user || !currentAgency || isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Check if agency subscription is valid
      const { data: isValid, error } = await supabase.rpc('is_agency_subscription_valid', {
        agency_uuid: currentAgency.id
      });

      if (error) throw error;

      if (!isValid) {
        setPaymentStatus({
          isValid: false,
          isBlocked: true,
          reason: 'Subscription expired or payment overdue'
        });
        return;
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabase.rpc('get_agency_subscription', {
        agency_uuid: currentAgency.id
      });

      if (subError) throw subError;

      if (subscription && subscription.length > 0) {
        const sub = subscription[0];
        
        setPaymentStatus({
          isValid: true,
          isBlocked: false,
          trialEnd: sub.trial_end,
          subscriptionEnd: sub.current_period_end
        });

        setPlanLimits({
          users: sub.max_users,
          clients: sub.max_clients,
          leads: sub.max_leads,
          tasks: sub.max_tasks,
          storage: sub.max_storage_gb
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setPaymentStatus({
        isValid: false,
        isBlocked: true,
        reason: 'Unable to verify payment status'
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshUsageCounts = async () => {
    if (!currentAgency || isSuperAdmin) return;

    try {
      // Get current usage counts
      const [usersResult, clientsResult, tasksResult] = await Promise.all([
        supabase.from('agency_users').select('*', { count: 'exact', head: true }).eq('agency_id', currentAgency.id),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('agency_id', currentAgency.id).eq('active', true),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('agency_id', currentAgency.id).eq('archived', false)
      ]);

      setUsageCounts({
        users: usersResult.count || 0,
        clients: clientsResult.count || 0,
        leads: 0, // Placeholder - implement when leads feature is added
        tasks: tasksResult.count || 0,
        storage: 0 // Placeholder - implement when storage tracking is added
      });
    } catch (error) {
      console.error('Error fetching usage counts:', error);
    }
  };

  const refreshPaymentStatus = async () => {
    setLoading(true);
    await Promise.all([checkPaymentStatus(), refreshUsageCounts()]);
  };

  const checkLimit = (type: keyof PlanLimits, newCount?: number): boolean => {
    if (isSuperAdmin) return true;
    
    const currentCount = newCount !== undefined ? newCount : usageCounts[type];
    const limit = planLimits[type];
    
    return currentCount < limit;
  };

  const enforceLimit = (type: keyof PlanLimits, action: string): boolean => {
    if (isSuperAdmin) return true;

    if (!paymentStatus.isValid) {
      toast.error(`Não é possível ${action}. Assinatura inválida ou vencida.`);
      return false;
    }

    const currentCount = usageCounts[type];
    const limit = planLimits[type];

    if (currentCount >= limit) {
      const limitNames = {
        users: 'usuários',
        clients: 'clientes',
        leads: 'leads',
        tasks: 'tarefas',
        storage: 'armazenamento'
      };

      toast.error(
        `Limite de ${limitNames[type]} atingido (${currentCount}/${limit}). ` +
        `Faça upgrade do seu plano para continuar.`
      );
      return false;
    }

    return true;
  };

  const getUsagePercentage = (type: keyof PlanLimits): number => {
    if (planLimits[type] === 0) return 0;
    return Math.round((usageCounts[type] / planLimits[type]) * 100);
  };

  // Check payment status when user or agency changes
  useEffect(() => {
    if (user && currentAgency) {
      refreshPaymentStatus();
    } else {
      setLoading(false);
    }
  }, [user, currentAgency]);

  // Block access for agencies with invalid subscriptions
  useEffect(() => {
    if (!loading && !isSuperAdmin && paymentStatus.isBlocked) {
      // Redirect to payment page or show blocked screen
      toast.error('Acesso bloqueado: ' + (paymentStatus.reason || 'Subscription invalid'));
      // You can redirect to a payment page here
      // navigate('/subscription-expired');
    }
  }, [paymentStatus.isBlocked, loading, isSuperAdmin, navigate]);

  return (
    <PaymentMiddlewareContext.Provider
      value={{
        paymentStatus,
        planLimits,
        usageCounts,
        loading,
        isSuperAdmin,
        isAgencyAdmin,
        refreshPaymentStatus,
        checkLimit,
        enforceLimit,
        getUsagePercentage,
      }}
    >
      {children}
    </PaymentMiddlewareContext.Provider>
  );
}

export function usePaymentMiddleware() {
  const context = useContext(PaymentMiddlewareContext);
  if (context === undefined) {
    throw new Error('usePaymentMiddleware must be used within a PaymentMiddlewareProvider');
  }
  return context;
}