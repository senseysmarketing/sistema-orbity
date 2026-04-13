import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, AlertCircle, RefreshCw, ExternalLink, Sparkles } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAgency } from '@/hooks/useAgency';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageSubscriptionDialog } from './ManageSubscriptionDialog';

export function SubscriptionDetails() {
  const { 
    currentSubscription, 
    loading, 
    refreshing, 
    checkSubscription, 
    openCustomerPortal 
  } = useSubscription();
  const { currentAgency } = useAgency();
  const [showManageDialog, setShowManageDialog] = useState(false);

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

  const formatCurrency = (value?: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'trialing': return 'bg-blue-400';
      case 'past_due': return 'bg-red-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trialing': return 'Período de Teste (Ativo)';
      case 'past_due': return 'Pagamento Atrasado';
      case 'canceled': return 'Inativo';
      default: return 'Inativo';
    }
  };

  const isTrialing = currentSubscription?.subscription_status === 'trialing';
  const isSubscriptionActive = currentSubscription?.subscribed && 
    (currentSubscription?.subscription_status === 'active' || isTrialing);
  const needsUpgrade = isTrialing || 
    currentSubscription?.subscription_status === 'past_due' || 
    currentSubscription?.subscription_status === 'canceled';

  const trialDaysRemaining = isTrialing && currentSubscription?.trial_end
    ? Math.max(0, differenceInDays(new Date(currentSubscription.trial_end), new Date()))
    : null;

  const trialDaysText = trialDaysRemaining !== null
    ? trialDaysRemaining === 0 ? 'Expira hoje' : `Faltam ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? 's' : ''}`
    : null;

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
          Informações sobre sua assinatura
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Assinatura</span>
            <span className="font-semibold text-lg">
              {currentSubscription?.plan_name || 'Nenhuma assinatura'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <Badge className={`text-white ${getStatusColor(currentSubscription?.subscription_status)}`}>
              {getStatusText(currentSubscription?.subscription_status)}
            </Badge>
          </div>

          {isTrialing && currentSubscription?.trial_end && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Válido até</span>
              <div className="text-right">
                <span className="text-sm font-medium">
                  {formatDate(currentSubscription.trial_end)}
                </span>
                {trialDaysText && (
                  <p className="text-xs text-muted-foreground mt-0.5">{trialDaysText}</p>
                )}
              </div>
            </div>
          )}

          {(currentAgency?.monthly_value ?? 0) > 0 && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Valor Mensal</span>
              <span className="font-semibold text-lg">
                {formatCurrency(currentAgency?.monthly_value)}
              </span>
            </div>
          )}

          {isSubscriptionActive && !isTrialing && currentSubscription?.subscription_end && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Próxima Cobrança</span>
              <span className="text-sm font-medium">
                {formatDate(currentSubscription.subscription_end)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2">
          {isSubscriptionActive && !isTrialing && (
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
                Nenhuma assinatura ativa. Entre em contato com a equipe comercial para ativar sua conta.
              </p>
            </div>
          </div>
        )}

        {needsUpgrade && (
          <>
            <Separator className="my-4" />
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <p className="text-sm text-foreground">
                  Garanta acesso contínuo ao Orbity. Faça o upgrade para o plano completo e não perca seus dados.
                </p>
              </div>
              <Button
                className="w-full sm:w-auto"
                onClick={() => setShowManageDialog(true)}
              >
                Escolher Plano e Assinar
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <ManageSubscriptionDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
      />
    </Card>
  );
}
