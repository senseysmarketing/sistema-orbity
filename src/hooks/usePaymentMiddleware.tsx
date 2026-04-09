import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { useCache } from './useCache';
import { toast } from 'sonner';

interface PaymentStatus {
  isValid: boolean;
  isBlocked: boolean;
  reason?: string;
  trialEnd?: string;
  subscriptionEnd?: string;
}

interface PaymentMiddlewareContextType {
  paymentStatus: PaymentStatus;
  loading: boolean;
  isSuperAdmin: boolean;
  isAgencyAdmin: boolean;
  refreshPaymentStatus: () => Promise<void>;
}

const PaymentMiddlewareContext = createContext<PaymentMiddlewareContextType | undefined>(undefined);

export function PaymentMiddlewareProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { currentAgency } = useAgency();
  const cache = useCache<PaymentStatus>(3 * 60 * 1000);
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    isValid: true,
    isBlocked: false
  });
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAgencyAdmin = profile?.role === 'agency_admin';

  const checkPaymentStatus = async (forceRefresh = false) => {
    if (!user || !currentAgency || isSuperAdmin) {
      setLoading(false);
      return;
    }

    const cacheKey = `payment_${currentAgency.id}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached.exists && !cached.isStale) {
        setPaymentStatus(cached.data || { isValid: false, isBlocked: true });
        setLoading(false);
        return;
      }
    }

    try {
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
        cache.set(cacheKey, status, { ttl: 60000 });
        return;
      }

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
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      const errorStatus: PaymentStatus = {
        isValid: false,
        isBlocked: true,
        reason: 'Unable to verify payment status'
      };
      setPaymentStatus(errorStatus);
      cache.set(cacheKey, errorStatus, { ttl: 30000 });
    } finally {
      setLoading(false);
    }
  };

  const refreshPaymentStatus = async () => {
    setLoading(true);
    await checkPaymentStatus(true);
  };

  useEffect(() => {
    if (user && currentAgency) {
      const cacheKey = `payment_${currentAgency.id}`;
      const cached = cache.get(cacheKey);
      
      if (!cached.exists) {
        checkPaymentStatus();
      } else {
        setPaymentStatus(cached.data || { isValid: false, isBlocked: true });
        setLoading(false);
        
        if (cached.isStale) {
          setTimeout(() => {
            checkPaymentStatus(true);
          }, 1000);
        }
      }
    } else {
      setLoading(false);
    }
  }, [user, currentAgency]);

  useEffect(() => {
    if (!loading && !isSuperAdmin && paymentStatus.isBlocked) {
      toast.error('Atenção: ' + (paymentStatus.reason || 'Subscription invalid'));
    }
  }, [paymentStatus.isBlocked, loading, isSuperAdmin]);

  return (
    <PaymentMiddlewareContext.Provider
      value={{
        paymentStatus,
        loading,
        isSuperAdmin,
        isAgencyAdmin,
        refreshPaymentStatus,
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
