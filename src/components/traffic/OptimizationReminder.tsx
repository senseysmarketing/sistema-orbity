import { AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface OptimizationReminderProps {
  onNavigateToCampaigns?: () => void;
}

export function OptimizationReminder({ onNavigateToCampaigns }: OptimizationReminderProps) {
  const today = new Date().getDay();
  // Segunda (1), Quarta (3), Sexta (5)
  const isOptimizationDay = [1, 3, 5].includes(today);

  if (!isOptimizationDay) {
    return null;
  }

  const getDayName = () => {
    switch (today) {
      case 1: return "Segunda-feira";
      case 3: return "Quarta-feira";
      case 5: return "Sexta-feira";
      default: return "";
    }
  };

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              🎯 É dia de otimização!
            </p>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {getDayName()} é dia de revisar as campanhas. Como estão os resultados dos seus clientes?
            </AlertDescription>
          </div>
        </div>
        {onNavigateToCampaigns && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onNavigateToCampaigns}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Ver Campanhas
          </Button>
        )}
      </div>
    </Alert>
  );
}