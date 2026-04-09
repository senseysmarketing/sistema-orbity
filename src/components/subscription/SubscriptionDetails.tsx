import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CreditCard, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionDetails() {
  const { 
    currentSubscription, 
    loading, 
    refreshing, 
    checkSubscription, 
    openCustomerPortal 
  } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'trialing': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trial': return 'Período de Teste';
      case 'trialing': return 'Período de Teste';
      case 'past_due': return 'Pagamento Pendente';
      case 'canceled': return 'Cancelado';
      default: return 'Inativo';
    }
  };

  const isTrialActive = (currentSubscription?.subscription_status === 'trial' || 
    currentSubscription?.subscription_status === 'trialing') && 
    currentSubscription?.trial_end && 
    new Date(currentSubscription.trial_end) > new Date();

  const isSubscriptionActive = currentSubscription?.subscribed && 
    ['active', 'trial', 'trialing'].includes(currentSubscription?.subscription_status || '');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Detalhes da Assinatura
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkSubscription(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Informações sobre seu plano atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Plano Atual</span>
            <span className="font-semibold text-lg">
              {currentSubscription?.plan_name || 'Nenhum plano'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <Badge className={`text-white ${getStatusColor(currentSubscription?.subscription_status)}`}>
              {getStatusText(currentSubscription?.subscription_status)}
            </Badge>
          </div>

          {isTrialActive && currentSubscription?.trial_end && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Período de Teste Ativo
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Expira em {formatDate(currentSubscription.trial_end)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSubscriptionActive && currentSubscription?.subscription_end && !isTrialActive && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Próxima Cobrança</span>
              <span className="text-sm font-medium">
                {formatDate(currentSubscription.subscription_end)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          {isSubscriptionActive && (
            <Button
              onClick={openCustomerPortal}
              className="w-full"
              variant="outline"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Gerenciar Assinatura
            </Button>
          )}
        </div>

        {!currentSubscription?.plan_name && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Nenhum plano ativo. Entre em contato com a equipe comercial para ativar sua conta.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
