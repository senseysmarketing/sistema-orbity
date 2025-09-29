import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { useCache } from './useCache';
import { usePageVisibility } from './usePageVisibility';
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
  const { isVisible } = usePageVisibility();
  const cache = useCache<PaymentStatus>(3 * 60 * 1000); // 3 minutes cache
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
  const [lastCheckTime, setLastCheckTime] = useState(0);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAgencyAdmin = profile?.role === 'agency_admin';

  const checkPaymentStatus = async (forceRefresh = false) => {
    if (!user || !currentAgency || isSuperAdmin) {
      setLoading(false);
      return;
    }

    const cacheKey = `payment_${currentAgency.id}`;
    
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached.exists && !cached.isStale) {
        setPaymentStatus(cached.data || { isValid: false, isBlocked: true });
        setLoading(false);
        return;
      }
    }

    try {
      // Check if agency subscription is valid
      const { data: isValid, error } = await supabase.rpc('is_agency_subscription_valid', {
        agency_uuid: currentAgency.id
      });

      if (error) throw error;

      const status: PaymentStatus = {
        isValid: !!isValid,
        isBlocked: !isValid,
        reason: !isValid ? 'Subscription expired or payment overdue' : undefined
      };

      if (!isValid) {
        setPaymentStatus(status);
        cache.set(cacheKey, status, { ttl: 60000 }); // Short cache for invalid status
        return;
      }

      // Get subscription details
      const { data: subscription, error: subError } = await supabase.rpc('get_agency_subscription', {
        agency_uuid: currentAgency.id
      });

      if (subError) throw subError;

      if (subscription && subscription.length > 0) {
        const sub = subscription[0];
        
        const fullStatus: PaymentStatus = {
          isValid: true,
          isBlocked: false,
          trialEnd: sub.trial_end,
          subscriptionEnd: sub.current_period_end
        };

        setPaymentStatus(fullStatus);
        cache.set(cacheKey, fullStatus);

        setPlanLimits({
          users: sub.max_users,
          clients: sub.max_clients,
          leads: sub.max_leads,
          tasks: sub.max_tasks,
          storage: sub.max_storage_gb
        });
      }
      
      setLastCheckTime(Date.now());
    } catch (error) {
      console.error('Error checking payment status:', error);
      const errorStatus: PaymentStatus = {
        isValid: false,
        isBlocked: true,
        reason: 'Unable to verify payment status'
      };
      setPaymentStatus(errorStatus);
      cache.set(cacheKey, errorStatus, { ttl: 30000 }); // Short cache for errors
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
    await Promise.all([checkPaymentStatus(true), refreshUsageCounts()]);
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

  // Check payment status when user or agency changes with intelligent caching
  useEffect(() => {
    if (user && currentAgency) {
      // Only check immediately if we don't have cached data
      const cacheKey = `payment_${currentAgency.id}`;
      const cached = cache.get(cacheKey);
      
      if (!cached.exists) {
        checkPaymentStatus();
        refreshUsageCounts();
      } else {
        setPaymentStatus(cached.data || { isValid: false, isBlocked: true });
        setLoading(false);
        
        // Schedule a background refresh if data is getting stale
        if (cached.isStale) {
          setTimeout(() => {
            if (isVisible) {
              checkPaymentStatus(true);
              refreshUsageCounts();
            }
          }, 1000);
        }
      }
    } else {
      setLoading(false);
    }
  }, [user, currentAgency]);

  // Remove automatic blocking - just show warning toasts instead
  useEffect(() => {
    if (!loading && !isSuperAdmin && paymentStatus.isBlocked) {
      // Show warning toast instead of blocking access
      toast.error('Atenção: ' + (paymentStatus.reason || 'Subscription invalid'));
      // Don't redirect automatically - let user choose when to act
    }
  }, [paymentStatus.isBlocked, loading, isSuperAdmin]);

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