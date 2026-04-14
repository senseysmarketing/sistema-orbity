import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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

const VALID_DEFAULT: PaymentStatus = { isValid: true, isBlocked: false };
const RPC_TIMEOUT_MS = 10_000;

const PaymentMiddlewareContext = createContext<PaymentMiddlewareContextType | undefined>(undefined);

export function PaymentMiddlewareProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { currentAgency } = useAgency();
  const cache = useCache<PaymentStatus>(Infinity);
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(VALID_DEFAULT);
  const [loading, setLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCheckingRef = useRef(false);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAgencyAdmin = profile?.role === 'agency_admin';

  const clearSafetyTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const checkPaymentStatus = async (forceRefresh = false) => {
    // Guard: no user or no agency → valid by default, don't hang
    if (!user || !currentAgency || isSuperAdmin) {
      console.log('[PaymentMiddleware] Skipping check (no user/agency or superAdmin)');
      setPaymentStatus(VALID_DEFAULT);
      setLoading(false);
      return;
    }
    // Concurrency guard: prevent duplicate simultaneous calls
    if (isCheckingRef.current) return;

    console.log('[PaymentMiddleware] Checking for agency:', currentAgency.id);

    const cacheKey = `payment_${currentAgency.id}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached.exists && !cached.isStale) {
        setPaymentStatus(cached.data || VALID_DEFAULT);
        setLoading(false);
        return;
      }
    }

    // Safety timeout: if RPC hangs, force fail-open after 10s
    clearSafetyTimeout();
    timeoutRef.current = setTimeout(() => {
      console.warn('[PaymentMiddleware] RPC timeout reached — forcing fail-open');
      setPaymentStatus(VALID_DEFAULT);
      setLoading(false);
    }, RPC_TIMEOUT_MS);

    isCheckingRef.current = true;
    try {
      const { data: isValid, error } = await supabase.rpc('is_agency_subscription_valid', {
        agency_uuid: currentAgency.id
      });

      clearSafetyTimeout();
      console.log('[PaymentMiddleware] RPC result:', { isValid, error: error?.message });

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
      clearSafetyTimeout();
      // FAIL-OPEN: network/RPC errors should NOT block legitimate users
      console.error('[PaymentMiddleware] Error (fail-open applied):', error);
      setPaymentStatus(VALID_DEFAULT);
      cache.set(cacheKey, VALID_DEFAULT, { ttl: 30000 });
    } finally {
      isCheckingRef.current = false;
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
        setPaymentStatus(cached.data || VALID_DEFAULT);
        setLoading(false);
      }
    } else {
      // No user or agency yet — don't hang, set valid default
      setPaymentStatus(VALID_DEFAULT);
      setLoading(false);
    }
  }, [user, currentAgency]);

  useEffect(() => {
    if (!loading && !isSuperAdmin && paymentStatus.isBlocked) {
      toast.error('Atenção: ' + (paymentStatus.reason || 'Subscription invalid'));
    }
  }, [paymentStatus.isBlocked, loading, isSuperAdmin]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearSafetyTimeout();
  }, []);

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
