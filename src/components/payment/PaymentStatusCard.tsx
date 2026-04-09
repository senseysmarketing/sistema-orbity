import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AlertTriangle, 
  CheckCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';

export function PaymentStatusCard() {
  const { paymentStatus, isSuperAdmin } = usePaymentMiddleware();
  const { currentSubscription } = useSubscription();

  const subscriptionActive = !!(currentSubscription?.subscribed &&
    ['active', 'trial', 'trialing', 'past_due'].includes(currentSubscription?.subscription_status || ''));
  
  const isBlocked = !paymentStatus.isValid && !subscriptionActive;

  if (isSuperAdmin) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-lg text-yellow-800">Super Admin</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700">
            Você tem acesso total ao sistema como Super Administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card className={isBlocked ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isBlocked ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            <CardTitle className={`text-lg ${isBlocked ? 'text-red-800' : 'text-green-800'}`}>
              Status da Assinatura
            </CardTitle>
          </div>
          <Badge variant={isBlocked ? 'destructive' : 'default'}>
            {isBlocked ? 'Bloqueado' : 'Ativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isBlocked ? (
          <p className="text-sm text-red-700">
            {paymentStatus.reason || 'Acesso bloqueado devido a problemas de pagamento'}
          </p>
        ) : (
          <div className="space-y-2">
            {paymentStatus.trialEnd && (
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-blue-700">
                  Trial termina em: {formatDate(paymentStatus.trialEnd)}
                </span>
              </div>
            )}
            {paymentStatus.subscriptionEnd && (
              <div className="flex items-center space-x-2 text-sm">
                <CreditCard className="h-4 w-4 text-green-600" />
                <span className="text-green-700">
                  Próxima cobrança: {formatDate(paymentStatus.subscriptionEnd)}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
