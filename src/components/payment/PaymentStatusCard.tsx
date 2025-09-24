import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CreditCard, 
  Users, 
  Building2, 
  CheckCircle,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';

export function PaymentStatusCard() {
  const { 
    paymentStatus, 
    planLimits, 
    usageCounts, 
    isSuperAdmin,
    getUsagePercentage 
  } = usePaymentMiddleware();
  const { openCustomerPortal } = useSubscription();

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
    <div className="space-y-4">
      {/* Payment Status */}
      <Card className={paymentStatus.isBlocked ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {paymentStatus.isBlocked ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <CardTitle className={`text-lg ${paymentStatus.isBlocked ? 'text-red-800' : 'text-green-800'}`}>
                Status da Assinatura
              </CardTitle>
            </div>
            <Badge variant={paymentStatus.isBlocked ? 'destructive' : 'default'}>
              {paymentStatus.isBlocked ? 'Bloqueado' : 'Ativo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {paymentStatus.isBlocked ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {paymentStatus.reason || 'Acesso bloqueado devido a problemas de pagamento'}
                </AlertDescription>
              </Alert>
              <Button onClick={openCustomerPortal} className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Gerenciar Assinatura
              </Button>
            </div>
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

      {/* Usage Limits */}
      {!paymentStatus.isBlocked && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Uso do Plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(usageCounts).map(([key, count]) => {
              const limit = planLimits[key as keyof typeof planLimits];
              const percentage = getUsagePercentage(key as keyof typeof planLimits);
              
              if (limit === 0) return null;

              const labels = {
                users: 'Usuários',
                clients: 'Clientes',
                leads: 'Leads',
                tasks: 'Tarefas',
                storage: 'Armazenamento (GB)'
              };

              const icons = {
                users: Users,
                clients: Building2,
                leads: Users,
                tasks: CheckCircle,
                storage: Users
              };

              const Icon = icons[key as keyof typeof icons];
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{labels[key as keyof typeof labels]}</span>
                    </div>
                    <span className={percentage >= 90 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                      {count}/{limit}
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={`h-2 ${percentage >= 90 ? 'text-red-600' : ''}`}
                  />
                  {percentage >= 90 && (
                    <p className="text-xs text-red-600">
                      Limite quase atingido! Considere fazer upgrade do plano.
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}