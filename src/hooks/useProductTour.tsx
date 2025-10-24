import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { tourSteps, TourStep } from '@/components/tour/tourSteps';

interface ProductTourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentStepData: TourStep | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  goToStep: (stepIndex: number) => void;
}

const ProductTourContext = createContext<ProductTourContextType | undefined>(undefined);

export function ProductTourProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = tourSteps.length;

  const currentStepData = isActive ? tourSteps[currentStep] : null;

  useEffect(() => {
    // Check if user has completed tour
    if (profile && !profile.tour_completed && !profile.welcome_seen) {
      // Tour will be started from Welcome page
    }
  }, [profile]);

  const startTour = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCurrentStep(stepIndex);
    }
  };

  const skipTour = async () => {
    setIsActive(false);
    setCurrentStep(0);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed: true })
        .eq('user_id', user.id);
    }
  };

  const completeTour = async () => {
    setIsActive(false);
    setCurrentStep(0);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed: true })
        .eq('user_id', user.id);
    }
  };

  return (
    <ProductTourContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps,
        currentStepData,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        goToStep
      }}
    >
      {children}
    </ProductTourContext.Provider>
  );
}

export function useProductTour() {
  const context = useContext(ProductTourContext);
  if (context === undefined) {
    throw new Error('useProductTour must be used within a ProductTourProvider');
  }
  return context;
}
