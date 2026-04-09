import { ReactNode } from 'react';
import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { BlockedAccessScreen } from '@/components/payment/BlockedAccessScreen';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocation } from 'react-router-dom';
import { isMasterAgencyAdmin } from '@/lib/masterAccess';

interface PaymentMiddlewareWrapperProps {
  children: ReactNode;
}

export function PaymentMiddlewareWrapper({ children }: PaymentMiddlewareWrapperProps) {
  const { paymentStatus, loading, isSuperAdmin } = usePaymentMiddleware();
  const { session } = useAuth();
  const { currentAgency, agencyRole } = useAgency();
  const { currentSubscription } = useSubscription();
  const location = useLocation();

  // Verificar se é admin da agência master (Senseys)
  const isMasterUser = isMasterAgencyAdmin(currentAgency?.id, agencyRole);

  // Never block the auth page
  if (location.pathname.startsWith('/auth')) {
    return <>{children}</>;
  }

  // Show loading spinner while checking payment status
  if (loading) {
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
    return <BlockedAccessScreen />;
  }

  return <>{children}</>;
}