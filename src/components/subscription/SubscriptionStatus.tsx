import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, CreditCard, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { ManageSubscriptionDialog } from './ManageSubscriptionDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SubscriptionStatus() {
  const { currentSubscription, loading, refreshing, checkSubscription, openCustomerPortal } = useSubscription();
  const [showManageDialog, setShowManageDialog] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Status da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-10 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trial': return 'bg-blue-500';
      case 'trialing': return 'bg-blue-500';
      case 'past_due': return 'bg-yellow-500';
      case 'canceled': return 'bg-red-500';
      case 'inactive': return 'bg-gray-500';
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
      case 'inactive': return 'Inativo';
      default: return 'Inativo';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Status da Assinatura
          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkSubscription(true)}
            disabled={refreshing}
            className="ml-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Informações sobre sua assinatura atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Plano Selecionado:</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">
              {currentSubscription?.plan_name || 'Nenhum plano selecionado'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge 
            variant="secondary" 
            className={`text-white ${getStatusColor(currentSubscription?.subscription_status)}`}
          >
            {getStatusText(currentSubscription?.subscription_status)}
          </Badge>
        </div>

        {isTrialActive && currentSubscription?.trial_end && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Trial Ativo - Plano {currentSubscription.plan_name}
              </span>
            </div>
            <span className="text-sm text-blue-700 font-medium">
              Expira em {formatDate(currentSubscription.trial_end)}
            </span>
          </div>
        )}

        {!isTrialActive && currentSubscription?.trial_end && 
         new Date(currentSubscription.trial_end) <= new Date() && (
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">
                Trial Expirado
              </span>
            </div>
            <span className="text-sm text-red-700 font-medium">
              Expirou em {formatDate(currentSubscription.trial_end)}
            </span>
          </div>
        )}

        {isSubscriptionActive && currentSubscription?.subscription_end && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Próxima Cobrança:</span>
            <span className="text-sm">
              {formatDate(currentSubscription.subscription_end)}
            </span>
          </div>
        )}

        {!currentSubscription?.plan_name && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Nenhum plano selecionado. Complete o onboarding para escolher um plano.
            </p>
          </div>
        )}

        {currentSubscription?.plan_name && !isTrialActive && 
         currentSubscription?.subscription_status !== 'active' && (
          <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-yellow-800">
              Para continuar usando o plano {currentSubscription.plan_name}, você precisa ativar sua assinatura.
            </p>
          </div>
        )}

        {isSubscriptionActive && (
          <Button
            onClick={() => {
              // Para planos locais (sem customer_id), usar dialog personalizado
              if (!currentSubscription?.customer_id) {
                setShowManageDialog(true);
              } else {
                // Para planos do Stripe, usar customer portal
                openCustomerPortal();
              }
            }}
            className="w-full"
            variant="outline"
          >
            Gerenciar Assinatura
          </Button>
        )}
      </CardContent>

      <ManageSubscriptionDialog 
        open={showManageDialog} 
        onOpenChange={setShowManageDialog} 
      />
    </Card>
  );
}