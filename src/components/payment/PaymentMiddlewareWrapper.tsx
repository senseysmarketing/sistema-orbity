import { ReactNode, useState, useEffect } from 'react';
import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { BlockedAccessScreen } from '@/components/payment/BlockedAccessScreen';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocation } from 'react-router-dom';
import { isMasterAgencyAdmin } from '@/lib/masterAccess';

const FORCE_ALLOW_TIMEOUT_MS = 15_000;

interface PaymentMiddlewareWrapperProps {
  children: ReactNode;
}

export function PaymentMiddlewareWrapper({ children }: PaymentMiddlewareWrapperProps) {
  const { paymentStatus, loading, isSuperAdmin } = usePaymentMiddleware();
  const { session } = useAuth();
  const { currentAgency, agencyRole } = useAgency();
  const { currentSubscription } = useSubscription();
  const location = useLocation();
  const [forceAllow, setForceAllow] = useState(false);

  // Safety fallback: if loading hangs for 15s, force-allow access
  useEffect(() => {
    if (!loading) {
      setForceAllow(false);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn('[PaymentMiddlewareWrapper] Loading timeout reached (15s) — forcing access');
      setForceAllow(true);
    }, FORCE_ALLOW_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [loading]);

  // Verificar se é admin da agência master (Senseys)
  const isMasterUser = isMasterAgencyAdmin(currentAgency?.id, agencyRole);

  // Never block auth or register pages
  if (location.pathname.startsWith('/auth') || location.pathname.startsWith('/register')) {
    return <>{children}</>;
  }

  // Show loading spinner while checking payment status (with force-allow escape)
  if (loading && !forceAllow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Master agency admins bypass all checks
  if (isMasterUser) {
    return <>{children}</>;
  }

  // If not authenticated, don't block (allow auth/public routes)
  if (!session) {
    return <>{children}</>;
  }

  // If force-allowed due to timeout, skip payment checks
  if (forceAllow) {
    return <>{children}</>;
  }

  // Consider subscription context as source of truth to avoid false blocks
  const subscriptionActive = !!(currentSubscription?.subscribed &&
    ['active', 'trial', 'trialing', 'past_due'].includes(currentSubscription?.subscription_status || ''));

  // Check if agency is suspended (is_active === false)
  const agencySuspended = currentAgency?.is_active === false;

  // Check if past_due > 5 days (inadimplente)
  const isPastDueBlocked = currentSubscription?.subscription_status === 'past_due' &&
    currentSubscription?.subscription_end &&
    (new Date().getTime() - new Date(currentSubscription.subscription_end).getTime()) / (1000 * 60 * 60 * 24) > 5;

  // Block access if: agency suspended, past_due > 5 days, or trial expired without valid subscription
  const isBlocked = agencySuspended || isPastDueBlocked || (!paymentStatus?.isValid && !isSuperAdmin && !subscriptionActive);
  
  if (isBlocked) {
    const reason = agencySuspended ? 'suspended' : 'payment';
    return <BlockedAccessScreen reason={reason} />;
  }

  return <>{children}</>;
}
