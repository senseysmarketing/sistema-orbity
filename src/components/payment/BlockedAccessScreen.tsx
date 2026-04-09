import { useState } from 'react';
import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Calendar, LogOut, MessageCircle, CreditCard, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';

interface BlockedAccessScreenProps {
  onRetry?: () => void;
}

export function BlockedAccessScreen({ onRetry }: BlockedAccessScreenProps) {
  const { refreshPaymentStatus } = usePaymentMiddleware();
  const { currentSubscription, checkSubscription, createCheckout } = useSubscription();
  const { signOut } = useAuth();
  const { currentAgency } = useAgency();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleRetry = async () => {
    await checkSubscription(true);
    await refreshPaymentStatus();
    onRetry?.();
  };

  const handlePayment = async () => {
    if (!currentAgency?.id) return;
    setCheckingOut(true);
    try {
      await createCheckout(undefined, currentAgency.id);
    } finally {
      setCheckingOut(false);
    }
  };

  const isTrialExpired = currentSubscription?.subscription_end && 
    new Date(currentSubscription.subscription_end) <= new Date();

  // First access: no subscription at all (not even expired)
  const isFirstAccess = !currentSubscription?.subscription_status || 
    currentSubscription.subscription_status === 'none' ||
    currentSubscription.subscription_status === 'pending_payment';

  // Inadimplente: had subscription but payment failed
  const _isOverdue = currentSubscription?.subscription_status === 'past_due';

  const hasMonthlyValue = currentAgency?.monthly_value && currentAgency.monthly_value > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className={isFirstAccess ? "border-primary/30 bg-primary/5" : "border-red-200 bg-red-50"}>
          <CardHeader className="text-center space-y-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
              isFirstAccess ? 'bg-primary/10' : 'bg-red-100'
            }`}>
              {isFirstAccess ? (
                <CreditCard className="h-8 w-8 text-primary" />
              ) : isTrialExpired ? (
                <Calendar className="h-8 w-8 text-red-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className={`text-2xl ${isFirstAccess ? 'text-foreground' : 'text-red-800'}`}>
              {isFirstAccess 
                ? 'Ative sua Assinatura' 
                : isTrialExpired 
                  ? 'Trial Expirado' 
                  : 'Acesso Suspenso'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className={isFirstAccess ? 'text-muted-foreground' : 'text-red-700'}>
              {isFirstAccess 
                ? `Bem-vindo! Para começar a usar o sistema, realize o pagamento da sua assinatura${
                    hasMonthlyValue ? ` (R$ ${currentAgency.monthly_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês)` : ''
                  }.`
                : isTrialExpired 
                  ? 'Seu período de trial expirou. Realize o pagamento para continuar usando o sistema.'
                  : 'Acesso suspenso. Detectamos uma pendência financeira superior a 5 dias. Por favor, regularize o pagamento.'
              }
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                {/* Show payment button for first access or trial expired */}
                {(isFirstAccess || isTrialExpired) && hasMonthlyValue && (
                  <Button 
                    onClick={handlePayment}
                    disabled={checkingOut}
                    className="w-full"
                    size="lg"
                  >
                    {checkingOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {checkingOut ? 'Abrindo checkout...' : 'Realizar Pagamento'}
                  </Button>
                )}

                <Button 
                  onClick={() => window.open('https://wa.me/5511999999999?text=Olá, preciso de ajuda com minha assinatura.', '_blank')}
                  className={`w-full ${(isFirstAccess || isTrialExpired) && hasMonthlyValue ? '' : 'bg-green-600 hover:bg-green-700'}`}
                  variant={(isFirstAccess || isTrialExpired) && hasMonthlyValue ? 'outline' : 'default'}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar com a Equipe Comercial
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar Status
                </Button>

                <Button 
                  variant="outline" 
                  onClick={async () => {
                    await signOut();
                  }}
                  className="w-full border-red-300 text-red-600 hover:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da Conta
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Precisa de ajuda?</p>
              <p>
                Entre em contato: 
                <a href="mailto:suporte@senseys.com" className="underline ml-1">
                  suporte@senseys.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
