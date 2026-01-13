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
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackViewContent } from '@/lib/metaPixel';

export function ConfirmationStep() {
  const { 
    onboardingData, 
    submitOnboarding, 
    prevStep, 
    loading 
  } = useOnboarding();
  const navigate = useNavigate();
  const hasTrackedView = useRef(false);

  // Rastrear visualização da etapa de confirmação
  useEffect(() => {
    if (!hasTrackedView.current && onboardingData.planSlug) {
      trackViewContent({
        content_name: 'Onboarding Confirmation',
        content_category: 'Onboarding Final Review',
        content_ids: [onboardingData.planSlug],
        value: getPlanInfo(onboardingData.planSlug).price,
      });
      hasTrackedView.current = true;
    }
  }, [onboardingData.planSlug]);

  const handleSubmit = async () => {
    const success = await submitOnboarding();
    if (success) {
      // Navigate to welcome page for guided tour after successful onboarding
      navigate('/welcome');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Get plan details (for display purposes)
  const getPlanInfo = (slug: string) => {
    const plans = {
      basic: { name: 'Básico', price: 97 },
      professional: { name: 'Profissional', price: 197 },
      enterprise: { name: 'Enterprise', price: 597 }
    };
    return plans[slug as keyof typeof plans] || { name: slug, price: 0 };
  };

  const planInfo = getPlanInfo(onboardingData.planSlug || '');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle className="text-2xl">Confirme os Dados</CardTitle>
        <p className="text-muted-foreground">
          Revise as informações antes de criar sua agência
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
              <span className="font-medium">{planInfo.name}</span>
              <Badge variant="secondary">
                {formatCurrency(planInfo.price)}/mês
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                7 dias de trial gratuito
              </span>
            </div>
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Rocket className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-blue-900">
                O que acontece agora?
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Sua agência será criada automaticamente</li>
                <li>• O período de trial de 7 dias será iniciado</li>
                <li>• Você fará login automaticamente como administrador</li>
                <li>• Poderá começar a usar todas as funcionalidades imediatamente</li>
              </ul>
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
                Criando Agência...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-4 w-4" />
                Criar Agência
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}