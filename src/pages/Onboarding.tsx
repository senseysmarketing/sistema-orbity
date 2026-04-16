import { useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { CompanyDataStep } from '@/components/onboarding/CompanyDataStep';
import { PlanSelectionStep } from '@/components/onboarding/PlanSelectionStep';
import { AdminUserStep } from '@/components/onboarding/AdminUserStep';
import { ConfirmationStep } from '@/components/onboarding/ConfirmationStep';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Sparkles } from 'lucide-react';
import orbityLogo from '@/assets/orbity-logo-onboarding.png';
import { trackStartOnboarding, trackOnboardingStep } from '@/lib/metaPixel';

function OnboardingContent() {
  const { currentStep, totalSteps, flow } = useOnboarding();
  const hasTrackedStart = useRef(false);

  useEffect(() => {
    if (!hasTrackedStart.current) {
      trackStartOnboarding();
      trackOnboardingStep({
        step: 1,
        step_name: 'company_data',
        total_steps: totalSteps,
      });
      hasTrackedStart.current = true;
    }
  }, [totalSteps]);

  const renderStep = () => {
    if (flow === 'trial') {
      // Trial: 3 steps — company_data, admin_user, confirmation (skip plan selection)
      switch (currentStep) {
        case 1: return <CompanyDataStep />;
        case 2: return <AdminUserStep />;
        case 3: return <ConfirmationStep />;
        default: return <CompanyDataStep />;
      }
    }
    // Default / direct flows: 4 steps
    switch (currentStep) {
      case 1: return <CompanyDataStep />;
      case 2: return <PlanSelectionStep />;
      case 3: return <AdminUserStep />;
      case 4: return <ConfirmationStep />;
      default: return <CompanyDataStep />;
    }
  };

  const getSubtitle = () => {
    if (flow === 'trial') {
      return 'Configure sua agência em minutos e comece com 7 dias gratuitos. Tudo pronto para você começar a gerenciar seus projetos!';
    }
    if (flow === 'direct_monthly') {
      return 'Configure sua agência e finalize a assinatura mensal (R$ 397/mês).';
    }
    if (flow === 'direct_annual') {
      return 'Configure sua agência e finalize a assinatura anual (R$ 297/mês, cobrado anualmente).';
    }
    return 'Configure sua agência em minutos e comece com 7 dias gratuitos.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={orbityLogo} 
              alt="Orbity Logo" 
              className="h-12 w-auto"
            />
          </div>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">
              Crie Sua Agência
            </h1>
            <Sparkles className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {getSubtitle()}
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <Card>
            <CardContent className="p-6">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </CardContent>
          </Card>
        </div>

        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>
            Precisa de ajuda? Entre em contato conosco: 
            <a href="mailto:contato@orbityapp.com.br" className="text-primary hover:underline ml-1">
              contato@orbityapp.com.br
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const flow = useMemo(() => {
    const flowParam = searchParams.get('flow');
    if (flowParam === 'trial' || flowParam === 'direct_monthly' || flowParam === 'direct_annual') {
      return flowParam;
    }
    return 'default' as const;
  }, [searchParams]);

  // Redirect invalid/missing flow to trial (prevents access to legacy PlanSelectionStep)
  useEffect(() => {
    if (flow === 'default') {
      navigate('/onboarding?flow=trial', { replace: true });
    }
  }, [flow, navigate]);

  return (
    <OnboardingProvider flow={flow}>
      <OnboardingContent />
    </OnboardingProvider>
  );
}
