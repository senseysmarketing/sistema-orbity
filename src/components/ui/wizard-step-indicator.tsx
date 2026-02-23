import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function WizardStepIndicator({ currentStep, totalSteps, stepLabels }: WizardStepIndicatorProps) {
  return (
    <div className="flex items-center w-full px-2">
      {stepLabels.map((label, index) => {
        const step = index + 1;
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isPending = step > currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all border-2",
                  isCompleted && "bg-green-500 border-green-500 text-white",
                  isActive && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium text-center whitespace-nowrap",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isActive && "text-primary",
                  isPending && "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {step < totalSteps && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1.5 mt-[-1rem] rounded-full transition-all",
                  step < currentStep ? "bg-green-500" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
