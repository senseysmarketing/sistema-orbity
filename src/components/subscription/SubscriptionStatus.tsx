import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, RefreshCw } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { ManageSubscriptionDialog } from './ManageSubscriptionDialog';

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
      case 'trialing':
      case 'trial': return 'bg-blue-400';
      case 'past_due': return 'bg-red-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trialing':
      case 'trial': return 'Período de Teste (Ativo)';
      case 'past_due': return 'Pagamento Atrasado';
      case 'canceled': return 'Inativo';
      default: return 'Inativo';
    }
  };

  const isTrialing = currentSubscription?.subscription_status === 'trialing' || currentSubscription?.subscription_status === 'trial';
  const isSubscriptionActive = (currentSubscription?.subscribed && currentSubscription?.subscription_status === 'active') || isTrialing;

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
          Informações sobre sua assinatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Assinatura:</span>
          <span className="font-semibold text-lg">
            {currentSubscription?.plan_name || 'Nenhuma assinatura'}
          </span>
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

        {!currentSubscription?.plan_name && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Nenhuma assinatura ativa. Entre em contato com a equipe comercial.
            </p>
          </div>
        )}

        {currentSubscription?.plan_name && 
         currentSubscription?.subscription_status !== 'active' &&
         currentSubscription?.subscription_status !== 'trialing' && (
          <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm text-yellow-800">
              Para continuar usando o sistema, você precisa ativar sua assinatura.
            </p>
          </div>
        )}

        {isSubscriptionActive && (
          <Button
            onClick={() => {
              if (!currentSubscription?.customer_id || currentSubscription?.subscription_status === 'trialing') {
                setShowManageDialog(true);
              } else {
                openCustomerPortal();
              }
            }}
            className="w-full"
            variant="outline"
          >
            {currentSubscription?.subscription_status === 'trialing' ? 'Escolher Plano e Assinar' : 'Gerenciar Assinatura'}
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
