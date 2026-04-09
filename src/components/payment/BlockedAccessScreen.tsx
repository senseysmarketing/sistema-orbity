import { usePaymentMiddleware } from '@/hooks/usePaymentMiddleware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Calendar, LogOut, MessageCircle } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface BlockedAccessScreenProps {
  onRetry?: () => void;
}

export function BlockedAccessScreen({ onRetry }: BlockedAccessScreenProps) {
  const { refreshPaymentStatus } = usePaymentMiddleware();
  const { currentSubscription, checkSubscription } = useSubscription();
  const { signOut } = useAuth();

  const handleRetry = async () => {
    await checkSubscription(true);
    await refreshPaymentStatus();
    onRetry?.();
  };

  const isTrialExpired = currentSubscription?.subscription_end && 
    new Date(currentSubscription.subscription_end) <= new Date();

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
                ? 'Seu período de trial expirou. Entre em contato com nossa equipe comercial para ativar sua assinatura.'
                : 'Sua agência foi suspensa. Entre em contato com nossa equipe para regularizar o acesso.'
              }
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Button 
                  onClick={() => window.open('https://wa.me/5500000000000', '_blank')}
                  className="w-full bg-green-600 hover:bg-green-700"
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
