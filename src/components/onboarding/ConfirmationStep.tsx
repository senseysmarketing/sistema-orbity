import { useEffect, useRef } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  ArrowLeft, 
  Rocket, 
  Building2, 
  User, 
  Calendar,
  Shield,
  CreditCard,
  TrendingDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackViewContent, trackCompleteRegistration } from '@/lib/metaPixel';

export function ConfirmationStep() {
  const { 
    onboardingData, 
    submitOnboarding, 
    prevStep, 
    loading,
    flow
  } = useOnboarding();
  const navigate = useNavigate();
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (!hasTrackedView.current) {
      const value = flow === 'direct_annual' ? 297 : flow === 'direct_monthly' ? 397 : 0;
      trackViewContent({
        content_name: 'Onboarding Confirmation',
        content_category: `Onboarding - ${flow}`,
        content_ids: [onboardingData.planSlug || 'orbity_trial'],
        value,
      });
      hasTrackedView.current = true;
    }
  }, [flow, onboardingData.planSlug]);

  const handleSubmit = async () => {
    const success = await submitOnboarding();
    if (success) {
      const contentName = flow === 'trial' ? 'Trial 7 Dias'
        : flow === 'direct_annual' ? 'Orbity Anual' : 'Orbity Mensal';
      trackCompleteRegistration({ content_name: contentName, currency: 'BRL' });
      if (flow === 'trial') {
        navigate('/welcome');
      }
    }
    // direct flows: redirect handled by initiateCheckout (window.open to checkout URL)
  };

  const getPlanDisplay = () => {
    switch (flow) {
      case 'direct_monthly':
        return {
          title: 'Orbity Mensal - Acesso Completo',
          price: 'R$ 397,00/mês',
          badge: <Badge variant="secondary" className="bg-blue-100 text-blue-800">Faturamento Mensal</Badge>,
          showTrial: false,
        };
      case 'direct_annual':
        return {
          title: 'Orbity Anual - Acesso Completo',
          price: '12x R$ 297,00',
          badge: <Badge variant="secondary" className="bg-green-100 text-green-800"><TrendingDown className="h-3 w-3 mr-1" />Economia de R$ 1.200 ao ano</Badge>,
          showTrial: false,
        };
      case 'trial':
      default:
        return {
          title: 'Orbity - Acesso Completo',
          price: 'Definido após o teste',
          badge: null,
          showTrial: true,
        };
    }
  };

  const planDisplay = getPlanDisplay();
  const isDirect = flow === 'direct_monthly' || flow === 'direct_annual';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Confirme os Dados</CardTitle>
        <p className="text-muted-foreground">
          Revise as informações antes de {isDirect ? 'prosseguir para o pagamento' : 'criar sua agência'}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Dados da Empresa</h3>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Nome:</span>
              <span className="text-sm">{onboardingData.companyData?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{onboardingData.companyData?.contactEmail}</span>
            </div>
            {onboardingData.companyData?.contactPhone && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Telefone:</span>
                <span className="text-sm">{onboardingData.companyData?.contactPhone}</span>
              </div>
            )}
            {onboardingData.companyData?.description && (
              <div>
                <span className="text-sm font-medium">Descrição:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {onboardingData.companyData?.description}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Plan Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Plano Selecionado</h3>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{planDisplay.title}</span>
              {isDirect ? (
                <Badge variant="secondary">{planDisplay.price}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground italic">{planDisplay.price}</span>
              )}
            </div>
            {planDisplay.badge && (
              <div className="flex items-center">
                {planDisplay.badge}
              </div>
            )}
            {planDisplay.showTrial && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 font-medium">
                  7 dias de trial gratuito
                </span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Admin User Info */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Administrador</h3>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Nome:</span>
              <span className="text-sm">{onboardingData.adminUser?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm">{onboardingData.adminUser?.email}</span>
            </div>
            <Badge variant="outline" className="w-fit">
              Administrador Principal
            </Badge>
          </div>
        </div>

        {/* What happens next */}
        <div className={`${isDirect ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'} border rounded-lg p-4`}>
          <div className="flex items-start space-x-3">
            {isDirect ? (
              <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
            ) : (
              <Rocket className="h-5 w-5 text-green-600 mt-0.5" />
            )}
            <div className="space-y-2">
              <h4 className={`text-sm font-medium ${isDirect ? 'text-blue-900' : 'text-green-900'}`}>
                O que acontece agora?
              </h4>
              {isDirect ? (
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Sua agência será criada automaticamente</li>
                  <li>• Você será direcionado para o pagamento seguro</li>
                  <li>• Seu acesso será liberado imediatamente após a confirmação</li>
                  <li>• Poderá começar a usar todas as funcionalidades na hora</li>
                </ul>
              ) : (
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Sua agência será criada automaticamente</li>
                  <li>• O período de trial de 7 dias será iniciado</li>
                  <li>• Você fará login automaticamente como administrador</li>
                  <li>• Após o teste, escolha o plano ideal para continuar</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={loading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isDirect ? 'Processando...' : 'Criando Agência...'}
              </>
            ) : isDirect ? (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Ir para Pagamento
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Criar Agência e Iniciar Trial
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
