import { useState } from 'react';
import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Calendar, LogOut, MessageCircle, CreditCard, Loader2, Check, ArrowLeft, Ban } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';

interface BlockedAccessScreenProps {
  onRetry?: () => void;
  reason?: 'suspended' | 'payment';
}

export function BlockedAccessScreen({ onRetry }: BlockedAccessScreenProps) {
  const { refreshPaymentStatus } = usePaymentMiddleware();
  const { currentSubscription, checkSubscription, createCheckout } = useSubscription();
  const { signOut } = useAuth();
  const { currentAgency } = useAgency();
  const [checkingOut, setCheckingOut] = useState(false);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly' | null>(null);

  const handleRetry = async () => {
    await checkSubscription(true);
    await refreshPaymentStatus();
    onRetry?.();
  };

  const handlePayment = async (billingCycle: 'monthly' | 'yearly') => {
    if (!currentAgency?.id) return;
    setCheckingOut(true);
    setSelectedBillingCycle(billingCycle);
    try {
      await createCheckout(undefined, currentAgency.id);
    } finally {
      setCheckingOut(false);
      setSelectedBillingCycle(null);
    }
  };

  const isTrialExpired = currentSubscription?.subscription_end && 
    new Date(currentSubscription.subscription_end) <= new Date();

  const isFirstAccess = !currentSubscription?.subscription_status || 
    currentSubscription.subscription_status === 'none' ||
    currentSubscription.subscription_status === 'pending_payment';

  const _isOverdue = currentSubscription?.subscription_status === 'past_due';

  const hasMonthlyValue = currentAgency?.monthly_value && currentAgency.monthly_value > 0;

  // Plan selection view (Correção 2)
  if (showPlanSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Escolha seu Plano</h2>
            <p className="text-muted-foreground">Selecione o plano que melhor se adequa à sua agência</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card className="border-2 hover:border-primary/50 cursor-pointer transition-all" onClick={() => handlePayment('monthly')}>
              <CardContent className="p-6 text-center space-y-3">
                <h3 className="font-bold text-lg">Mensal</h3>
                <div>
                  <span className="text-3xl font-bold">R$ 397</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">Sem fidelidade</p>
                <ul className="text-sm space-y-1 text-left">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-600" /> Todos os módulos</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-600" /> Cancele quando quiser</li>
                </ul>
                <Button 
                  className="w-full" 
                  disabled={checkingOut}
                  onClick={(e) => { e.stopPropagation(); handlePayment('monthly'); }}
                >
                  {checkingOut && selectedBillingCycle === 'monthly' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Assinar Mensal
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary/30 bg-primary/5 hover:border-primary cursor-pointer transition-all relative overflow-hidden" onClick={() => handlePayment('yearly')}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1c102f] to-violet-600" />
              <CardContent className="p-6 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-bold text-lg">Anual</h3>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full border border-green-500/20">
                    -25%
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-bold">R$ 297</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <p className="text-sm text-muted-foreground">Cobrado anualmente (R$ 3.564)</p>
                <ul className="text-sm space-y-1 text-left">
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-600" /> Todos os módulos</li>
                  <li className="flex items-center gap-2"><Check className="h-3 w-3 text-green-600" /> Economize R$ 1.200/ano</li>
                </ul>
                <Button 
                  className="w-full bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                  disabled={checkingOut}
                  onClick={(e) => { e.stopPropagation(); handlePayment('yearly'); }}
                >
                  {checkingOut && selectedBillingCycle === 'yearly' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
                  )}
                  Assinar Anual
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button variant="ghost" onClick={() => setShowPlanSelection(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                  ? 'Seu Período de Teste Expirou!' 
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
                  ? 'Você aproveitou os 7 dias de teste! Para continuar usando o Orbity, escolha um plano e assine agora.'
                  : 'Acesso suspenso. Detectamos uma pendência financeira superior a 5 dias. Por favor, regularize o pagamento.'
              }
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                {/* Trial expired or first access: show plan selection (Correção 2) */}
                {(isFirstAccess || isTrialExpired) && (
                  <Button 
                    onClick={() => {
                      if (hasMonthlyValue) {
                        // If agency has pre-negotiated value, go directly to checkout
                        handlePayment('monthly');
                      } else {
                        // Show plan selection cards
                        setShowPlanSelection(true);
                      }
                    }}
                    disabled={checkingOut}
                    className="w-full bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                    size="lg"
                  >
                    {checkingOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-2 h-4 w-4" />
                    )}
                    {checkingOut ? 'Abrindo checkout...' : 'Assinar Agora'}
                  </Button>
                )}

                <Button 
                  onClick={() => window.open('https://wa.me/5511999999999?text=Olá, preciso de ajuda com minha assinatura.', '_blank')}
                  className={`w-full ${(isFirstAccess || isTrialExpired) ? '' : 'bg-green-600 hover:bg-green-700'}`}
                  variant={(isFirstAccess || isTrialExpired) ? 'outline' : 'default'}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Preciso de Ajuda
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
