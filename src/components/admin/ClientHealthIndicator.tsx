import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientHealthIndicatorProps {
  latePaymentsLast3Months: number;
  hasLoyalty: boolean;
  loyaltyEndsInDays: number | null;
  renewalRate: number;
}

export function ClientHealthIndicator({
  latePaymentsLast3Months,
  hasLoyalty,
  loyaltyEndsInDays,
  renewalRate,
}: ClientHealthIndicatorProps) {
  // Calcula o status de saúde do cliente
  const getHealthStatus = (): 'healthy' | 'warning' | 'risk' => {
    // Cliente em risco se:
    // - Tem 2+ atrasos nos últimos 3 meses
    // - Fidelidade vence em menos de 15 dias
    // - Taxa de renovação < 50%
    if (
      latePaymentsLast3Months >= 2 ||
      (loyaltyEndsInDays !== null && loyaltyEndsInDays < 15 && loyaltyEndsInDays >= 0) ||
      renewalRate < 50
    ) {
      return 'risk';
    }

    // Cliente em atenção se:
    // - Tem 1 atraso nos últimos 3 meses
    // - Fidelidade vence em menos de 30 dias
    // - Taxa de renovação entre 50% e 75%
    if (
      latePaymentsLast3Months === 1 ||
      (loyaltyEndsInDays !== null && loyaltyEndsInDays < 30 && loyaltyEndsInDays >= 0) ||
      (renewalRate >= 50 && renewalRate < 75)
    ) {
      return 'warning';
    }

    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  const getStatusConfig = () => {
    switch (healthStatus) {
      case 'healthy':
        return {
          icon: CheckCircle,
          label: 'Saudável',
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          label: 'Atenção',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'risk':
        return {
          icon: AlertCircle,
          label: 'Risco',
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          iconColor: 'text-red-600 dark:text-red-400',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${config.iconColor}`} />
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    </div>
  );
}
