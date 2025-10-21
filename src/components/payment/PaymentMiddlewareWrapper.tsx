import { ReactNode } from 'react';
import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { useAuth } from '@/hooks/useAuth';
import { BlockedAccessScreen } from '@/components/payment/BlockedAccessScreen';

interface PaymentMiddlewareWrapperProps {
  children: ReactNode;
}

export function PaymentMiddlewareWrapper({ children }: PaymentMiddlewareWrapperProps) {
  const { paymentStatus, loading, isSuperAdmin } = usePaymentMiddleware();
  const { profile, session } = useAuth();

  // Show loading spinner while checking payment status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admins bypass all checks
  if (profile?.role === 'super_admin') {
    return <>{children}</>;
  }

  // If not authenticated, don't block (allow auth/public routes)
  if (!session) {
    return <>{children}</>;
  }

  // Block access if trial expired or subscription is not active
  const isBlocked = !paymentStatus?.isValid && !isSuperAdmin;
  
  if (isBlocked) {
    return <BlockedAccessScreen />;
  }

  return <>{children}</>;
}