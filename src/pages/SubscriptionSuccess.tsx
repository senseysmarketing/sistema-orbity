import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSubscription } = useSubscription();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Check subscription status after successful payment
    if (sessionId) {
      // Wait a moment for Stripe to process, then check
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    }
  }, [sessionId, checkSubscription]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">
            Assinatura Ativada!
          </CardTitle>
          <CardDescription>
            Sua assinatura foi processada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Parabéns! Sua assinatura está ativa e você já pode aproveitar todos os recursos do seu plano.
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                ID da sessão: {sessionId}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/settings')} 
              className="w-full"
            >
              Ver Configurações
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}