import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, RefreshCw, Calendar } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingCards } from '@/components/subscription/PricingCards';
import { useState } from 'react';

interface BlockedAccessScreenProps {
  onRetry?: () => void;
}

export function BlockedAccessScreen({ onRetry }: BlockedAccessScreenProps) {
  const { paymentStatus, refreshPaymentStatus } = usePaymentMiddleware();
  const { openCustomerPortal, currentSubscription } = useSubscription();
  const [showPlans, setShowPlans] = useState(false);

  const handleRetry = async () => {
    await refreshPaymentStatus();
    onRetry?.();
  };

  const isTrialExpired = currentSubscription?.subscription_end && 
    new Date(currentSubscription.subscription_end) <= new Date();

  if (showPlans) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-800 mb-2">
              {isTrialExpired ? 'Trial Expirado' : 'Acesso Suspenso'}
            </h1>
            <p className="text-red-600 mb-4">
              {isTrialExpired 
                ? 'Seu período de trial de 7 dias expirou. Escolha um plano para continuar.'
                : 'Escolha um novo plano ou gerencie sua assinatura atual.'
              }
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowPlans(false)}
              className="mb-6"
            >
              ← Voltar
            </Button>
          </div>
          <PricingCards />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              {isTrialExpired ? (
                <Calendar className="h-8 w-8 text-red-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl text-red-800">
              {isTrialExpired ? 'Trial Expirado' : 'Acesso Suspenso'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-red-700">
              {isTrialExpired 
                ? 'Seu período de trial de 7 dias expirou. Para continuar usando o sistema, você precisa assinar um dos nossos planos.'
                : (paymentStatus.reason || 'Sua agência foi suspensa devido a problemas de pagamento.')
              }
            </p>
            
            <div className="space-y-3">
              <p className="text-sm text-red-600">
                {isTrialExpired 
                  ? 'Escolha um plano para reativar o acesso completo.'
                  : 'Para reativar o acesso, regularize sua situação de pagamento.'
                }
              </p>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => setShowPlans(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {isTrialExpired ? 'Escolher Plano' : 'Ver Planos'}
                </Button>

                {!isTrialExpired && (
                  <Button 
                    onClick={openCustomerPortal} 
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Gerenciar Pagamento
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Verificar Status
                </Button>
              </div>
            </div>

            <div className="text-xs text-red-500 space-y-1">
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