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

      if (error) throw error;

      toast.success('Agência criada com sucesso! Trial de 7 dias iniciado.');
      
      // Auto-login the newly created user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: onboardingData.adminUser.email,
        password: onboardingData.adminUser.password
      });

      if (signInError) {
        console.error('Auto-login failed:', signInError);
        toast.error('Agência criada, mas falha no login automático. Tente fazer login manualmente.');
      }

      return true;
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Erro ao criar agência. Tente novamente.');
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