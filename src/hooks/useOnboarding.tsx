import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  trackLead, 
  trackInitiateCheckout, 
  trackOnboardingStep,
  trackOnboardingAbandoned,
  trackCompleteRegistration
} from '@/lib/metaPixel';

interface CompanyData {
  name: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
}

interface AdminUser {
  name: string;
  email: string;
  password: string;
}

interface OnboardingData {
  companyData: CompanyData;
  planSlug: string;
  adminUser: AdminUser;
}

type OnboardingFlow = 'trial' | 'direct_monthly' | 'direct_annual' | 'default';

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  onboardingData: Partial<OnboardingData>;
  loading: boolean;
  stepStartTime: number;
  flow: OnboardingFlow;
  updateCompanyData: (data: CompanyData) => void;
  updatePlanSelection: (planSlug: string) => void;
  updateAdminUser: (data: AdminUser) => void;
  nextStep: () => void;
  prevStep: () => void;
  submitOnboarding: () => Promise<boolean>;
  initiateCheckout: (planSlug: string) => Promise<boolean>;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Step names vary depending on flow
const getStepName = (step: number, flow: OnboardingFlow): string => {
  if (flow === 'trial') {
    // Trial: company_data -> admin_user -> confirmation (no plan selection)
    const stepNames: Record<number, string> = {
      1: 'company_data',
      2: 'admin_user',
      3: 'confirmation'
    };
    return stepNames[step] || 'unknown';
  }
  const stepNames: Record<number, string> = {
    1: 'company_data',
    2: 'plan_selection',
    3: 'admin_user',
    4: 'confirmation'
  };
  return stepNames[step] || 'unknown';
};

interface OnboardingProviderProps {
  children: ReactNode;
  flow?: OnboardingFlow;
}

export function OnboardingProvider({ children, flow = 'default' }: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [loading, setLoading] = useState(false);
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  
  // Trial flow skips plan selection (3 steps instead of 4)
  const totalSteps = flow === 'trial' ? 3 : 4;
  const hasTrackedAbandonment = useRef(false);

  // For trial flow, auto-set plan to basic
  useEffect(() => {
    if (flow === 'trial') {
      setOnboardingData(prev => ({ ...prev, planSlug: 'basic' }));
    } else if (flow === 'direct_monthly' || flow === 'direct_annual') {
      setOnboardingData(prev => ({ ...prev, planSlug: 'basic' }));
    }
  }, [flow]);

  // Rastrear abandono quando sai da página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasTrackedAbandonment.current) return;
      
      const timeSpent = Math.floor((Date.now() - stepStartTime) / 1000);
      trackOnboardingAbandoned({
        step: currentStep,
        step_name: getStepName(currentStep, flow),
        time_spent_seconds: timeSpent,
      });
      hasTrackedAbandonment.current = true;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, stepStartTime, flow]);

  const updateCompanyData = (data: CompanyData) => {
    setOnboardingData(prev => ({ ...prev, companyData: data }));
  };

  const updatePlanSelection = (planSlug: string) => {
    setOnboardingData(prev => ({ ...prev, planSlug }));
  };

  const updateAdminUser = (data: AdminUser) => {
    setOnboardingData(prev => ({ ...prev, adminUser: data }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const timeSpent = Math.floor((Date.now() - stepStartTime) / 1000);
      const nextStepNumber = currentStep + 1;
      
      trackOnboardingStep({
        step: nextStepNumber,
        step_name: getStepName(nextStepNumber, flow),
        total_steps: totalSteps,
        time_on_previous_step: timeSpent,
      });
      
      setStepStartTime(Date.now());
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      const timeSpent = Math.floor((Date.now() - stepStartTime) / 1000);
      const prevStepNumber = currentStep - 1;
      
      trackOnboardingStep({
        step: prevStepNumber,
        step_name: getStepName(prevStepNumber, flow),
        total_steps: totalSteps,
        time_on_previous_step: timeSpent,
      });
      
      setStepStartTime(Date.now());
      setCurrentStep(prev => prev - 1);
    }
  };

  const initiateCheckout = async (planSlug: string): Promise<boolean> => {
    if (!onboardingData.companyData || !onboardingData.adminUser) {
      toast.error('Complete os dados da empresa e do administrador primeiro');
      return false;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onboarding-checkout', {
        body: {
          companyData: onboardingData.companyData,
          adminUser: onboardingData.adminUser,
          planSlug,
          billingCycle: flow === 'direct_annual' ? 'yearly' : 'monthly'
        }
      });
      
      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Erro ao iniciar checkout');
      }
      
      if (!data || !data.checkoutUrl) {
        throw new Error('URL de checkout não retornada');
      }
      
      sessionStorage.setItem('onboarding_checkout', JSON.stringify({
        agencyId: data.agencyId,
        email: onboardingData.adminUser.email,
        password: onboardingData.adminUser.password,
        planSlug: planSlug
      }));
      
      trackInitiateCheckout({
        content_name: planSlug,
        currency: 'BRL'
      });
      
      toast.success('Redirecionando para checkout...');
      window.open(data.checkoutUrl, '_blank');
      
      return true;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(`Erro ao iniciar checkout: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submitOnboarding = async (): Promise<boolean> => {
    if (!onboardingData.companyData || !onboardingData.planSlug || !onboardingData.adminUser) {
      toast.error('Dados incompletos para finalizar o onboarding');
      return false;
    }

    // For direct flows, redirect to checkout instead of creating trial
    if (flow === 'direct_monthly' || flow === 'direct_annual') {
      return initiateCheckout(onboardingData.planSlug);
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agency-onboarding', {
        body: {
          companyData: onboardingData.companyData,
          planSlug: onboardingData.planSlug,
          adminUser: onboardingData.adminUser
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao criar agência');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Resposta inválida do servidor');
      }

      toast.success('Agência criada com sucesso! Trial de 7 dias iniciado.');
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: onboardingData.adminUser.email,
        password: onboardingData.adminUser.password
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        toast.error('Agência criada, mas falha no login automático. Tente fazer login manualmente.');
        return false;
      }

      hasTrackedAbandonment.current = true;
      
      trackCompleteRegistration({
        content_name: onboardingData.planSlug || 'basic',
        currency: 'BRL'
      });
      
      trackLead({
        content_name: onboardingData.planSlug || 'basic',
        content_category: 'Agency Onboarding',
        currency: 'BRL'
      });

      return true;
    } catch (error: any) {
      console.error('Onboarding error:', error);
      const errorMessage = error.message || 'Erro desconhecido ao criar agência';
      toast.error(`Erro ao criar agência: ${errorMessage}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetOnboarding = () => {
    setCurrentStep(1);
    setOnboardingData({});
    setLoading(false);
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        totalSteps,
        onboardingData,
        loading,
        stepStartTime,
        flow,
        updateCompanyData,
        updatePlanSelection,
        updateAdminUser,
        nextStep,
        prevStep,
        submitOnboarding,
        initiateCheckout,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
