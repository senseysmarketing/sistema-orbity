import { usePaymentMiddleware } from './usePaymentMiddleware';
import { toast } from 'sonner';

export function useLimitEnforcement() {
  const { enforceLimit, checkLimit, getUsagePercentage } = usePaymentMiddleware();

  const enforceLimitWithToast = (
    type: 'users' | 'clients' | 'leads' | 'tasks' | 'storage',
    action: string,
    onSuccess?: () => void
  ) => {
    const canProceed = enforceLimit(type, action);
    
    if (canProceed) {
      onSuccess?.();
      return true;
    }
    
    return false;
  };

  const checkLimitWithWarning = (
    type: 'users' | 'clients' | 'leads' | 'tasks' | 'storage',
    newCount?: number
  ): boolean => {
    const canAdd = checkLimit(type, newCount);
    const usagePercentage = getUsagePercentage(type);
    
    // Show warning at 80% usage
    if (usagePercentage >= 80 && usagePercentage < 100) {
      const limitNames = {
        users: 'usuários',
        clients: 'clientes',
        leads: 'leads',
        tasks: 'tarefas',
        storage: 'armazenamento'
      };
      
      toast.warning(
        `Você está próximo do limite de ${limitNames[type]} (${usagePercentage}% usado). ` +
        `Considere fazer upgrade do seu plano.`
      );
    }
    
    return canAdd;
  };

  return {
    enforceLimitWithToast,
    checkLimitWithWarning,
    enforceLimit,
    checkLimit,
    getUsagePercentage
  };
}