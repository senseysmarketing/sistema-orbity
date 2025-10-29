import { createContext, useContext, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface OnboardingContextType {
  currentStep: number;
  totalSteps: number;
  onboardingData: Partial<OnboardingData>;
  loading: boolean;
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

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [loading, setLoading] = useState(false);
  const totalSteps = 4;

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
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const initiateCheckout = async (planSlug: string): Promise<boolean> => {
    // Validar dados completos
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
          planSlug
        }
      });
      
      if (error) {
        console.error('Checkout error:', error);
        throw new Error(error.message || 'Erro ao iniciar checkout');
      }
      
      if (!data || !data.checkoutUrl) {
        throw new Error('URL de checkout não retornada');
      }
      
      // Salvar estado no sessionStorage para login posterior
      sessionStorage.setItem('onboarding_checkout', JSON.stringify({
        agencyId: data.agencyId,
        email: onboardingData.adminUser.email,
        password: onboardingData.adminUser.password
      }));
      
      toast.success('Redirecionando para checkout...');
      
      // Abrir checkout em nova aba
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
      
      // Auto-login the newly created user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: onboardingData.adminUser.email,
        password: onboardingData.adminUser.password
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        toast.error('Agência criada, mas falha no login automático. Tente fazer login manualmente.');
        return false;
      }

      // After successful login, user will be redirected to Welcome page by its own useEffect
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