import { Progress } from '@/components/ui/progress';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100;
  
  const steps = [
    'Dados da Empresa',
    'Escolha do Plano', 
    'Usuário Admin',
    'Confirmação'
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Passo {currentStep} de {totalSteps}</span>
        <span>{Math.round(progress)}% completo</span>
      </div>
      
      <Progress value={progress} className="w-full" />
      
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`text-xs text-center flex-1 ${
              index + 1 <= currentStep 
                ? 'text-primary font-medium' 
                : 'text-muted-foreground'
            }`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}