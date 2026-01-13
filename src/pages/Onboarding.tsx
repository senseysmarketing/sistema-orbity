import { useEffect, useRef } from 'react';
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
  const { currentStep, totalSteps } = useOnboarding();
  const hasTrackedStart = useRef(false);

  // Rastrear início do onboarding (apenas uma vez)
  useEffect(() => {
    if (!hasTrackedStart.current) {
      trackStartOnboarding();
      trackOnboardingStep({
        step: 1,
        step_name: 'company_data',
        total_steps: 4,
      });
      hasTrackedStart.current = true;
    }
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <CompanyDataStep />;
      case 2:
        return <PlanSelectionStep />;
      case 3:
        return <AdminUserStep />;
      case 4:
        return <ConfirmationStep />;
      default:
        return <CompanyDataStep />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
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
            Configure sua agência em minutos e comece com 7 dias gratuitos. 
            Tudo pronto para você começar a gerenciar seus projetos!
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <Card>
            <CardContent className="p-6">
              <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
            </CardContent>
          </Card>
        </div>

        {/* Current Step */}
        <div className="max-w-4xl mx-auto">
          {renderStep()}
        </div>

        {/* Footer */}
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
  return (
    <OnboardingProvider>
      <OnboardingContent />
    </OnboardingProvider>
  );
}