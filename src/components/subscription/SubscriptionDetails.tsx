import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CreditCard,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAgency } from '@/hooks/useAgency';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageSubscriptionDialog, type SubscriptionDialogMode } from './ManageSubscriptionDialog';

export function SubscriptionDetails() {
  const {
    currentSubscription,
    loading,
    refreshing,
    checkSubscription,
    openCustomerPortal,
  } = useSubscription();
  const { currentAgency } = useAgency();
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<SubscriptionDialogMode>('new');
  const [portalLoading, setPortalLoading] = useState(false);

  const openManageDialog = (mode: SubscriptionDialogMode) => {
    setDialogMode(mode);
    setShowManageDialog(true);
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      await openCustomerPortal();
    } finally {
      setPortalLoading(false);
    }
  };

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

  // Guardrail #1: parse seguro de datas (evita epoch / Invalid Date)
  const safeFormatDate = (dateString?: string | null): string | null => {
    if (!dateString) return null;
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime()) || parsed.getFullYear() < 2000) return null;
    return format(parsed, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatCurrency = (value?: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const status = currentSubscription?.subscription_status;
  const planName = currentSubscription?.plan_name;

  const getStatusBadge = () => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-500 text-white">Ativo</Badge>;
      case 'trialing':
      case 'trial':
        return <Badge className="bg-blue-500 hover:bg-blue-500 text-white">Período de Teste</Badge>;
      case 'past_due':
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Pagamento Pendente</Badge>;
      case 'canceled':
        return <Badge variant="outline" className="border-amber-500/40 text-amber-700">Cancelada</Badge>;
      default:
        return <Badge variant="outline">Inativa</Badge>;
    }
  };

  const isTrialing = status === 'trialing' || status === 'trial';
  const isActive = status === 'active';
  const isPastDue = status === 'past_due';
  const isCanceled = status === 'canceled';

  const trialDaysRemaining =
    isTrialing && currentSubscription?.trial_end
      ? Math.max(0, differenceInDays(new Date(currentSubscription.trial_end), new Date()))
      : null;

  const trialDaysText =
    trialDaysRemaining !== null
      ? trialDaysRemaining === 0
        ? 'Expira hoje'
        : `Faltam ${trialDaysRemaining} dia${trialDaysRemaining !== 1 ? 's' : ''}`
      : null;

  const trialEndFormatted = safeFormatDate(currentSubscription?.trial_end);
  const subscriptionEndFormatted = safeFormatDate(currentSubscription?.subscription_end);

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
        <CardDescription>Informações sobre sua assinatura</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Assinatura</span>
            <span className="font-semibold text-lg">
              {planName || 'Nenhuma assinatura'}
            </span>
          </div>

          <div className="flex items-center justify-between pb-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            {getStatusBadge()}
          </div>

          {isTrialing && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Válido até</span>
              <div className="text-right">
                <span className="text-sm font-medium">
                  {trialEndFormatted ?? 'Em processamento'}
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

          {isActive && subscriptionEndFormatted && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Próxima Cobrança</span>
              <span className="text-sm font-medium">{subscriptionEndFormatted}</span>
            </div>
          )}

          {isCanceled && subscriptionEndFormatted && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Acesso até</span>
              <span className="text-sm font-medium">{subscriptionEndFormatted}</span>
            </div>
          )}

          {isPastDue && subscriptionEndFormatted && (
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-sm font-medium text-muted-foreground">Vencimento em atraso</span>
              <span className="text-sm font-medium text-amber-700">{subscriptionEndFormatted}</span>
            </div>
          )}
        </div>

        {/* CTA dominante por estado */}
        {isActive && (
          <Button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            variant="outline"
            className="w-full"
          >
            {portalLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Gerenciar Assinatura
          </Button>
        )}

        {isPastDue && (
          <Alert className="border-amber-500/30 bg-amber-500/5 text-foreground">
            <AlertCircle className="h-4 w-4 !text-amber-600" />
            <AlertTitle>Pagamento Pendente</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                Identificamos uma cobrança em aberto. Regularize para manter o acesso contínuo ao Orbity.
              </p>
              <Button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full sm:w-auto"
              >
                {portalLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Regularizar no Stripe
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isCanceled && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Assinatura cancelada</p>
                <p className="text-sm text-muted-foreground">
                  {subscriptionEndFormatted
                    ? <>Seu acesso continua disponível até <strong>{subscriptionEndFormatted}</strong>.</>
                    : 'Reative sua assinatura para manter o acesso ao Orbity.'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => openManageDialog('reactivate')}
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Reativar Assinatura
            </Button>
          </div>
        )}

        {isTrialing && (() => {
          const trialEndDate = currentSubscription?.trial_end ? new Date(currentSubscription.trial_end) : null;
          const agencyCreatedAt = (currentAgency as any)?.created_at ? new Date((currentAgency as any).created_at) : null;
          const isCustomTrial = !!(
            trialEndDate &&
            agencyCreatedAt &&
            Math.abs(
              trialEndDate.getTime() - (agencyCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
            ) > 24 * 60 * 60 * 1000
          );
          return (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Você está no período de teste gratuito. Assine agora para garantir acesso contínuo ao Orbity após o término — sem precisar esperar os 7 dias.
                </p>
              </div>
              {isCustomTrial && (
                <p className="text-xs text-muted-foreground italic pl-7">
                  Período personalizado pela equipe Orbity.
                </p>
              )}
              <Button
                onClick={() => openManageDialog('upgrade')}
                className="w-full sm:w-auto"
              >
                Escolher Plano e Assinar
              </Button>
            </div>
          );
        })()}

        {!planName && !isTrialing && !isActive && !isPastDue && !isCanceled && (
          <div className="rounded-lg bg-muted p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Você ainda não possui uma assinatura ativa. Escolha um plano para liberar todos os recursos do Orbity.
              </p>
            </div>
            <Button
              onClick={() => openManageDialog('new')}
              className="w-full sm:w-auto"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Assinar Plano Agora
            </Button>
          </div>
        )}
      </CardContent>

      <ManageSubscriptionDialog
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        mode={dialogMode}
      />
    </Card>
  );
}
