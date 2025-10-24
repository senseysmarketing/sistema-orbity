import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExpenseHealthIndicatorProps {
  latePaymentsLast6Months: number;
  averageDaysLate: number;
  totalPayments: number;
}

export function ExpenseHealthIndicator({
  latePaymentsLast6Months,
  averageDaysLate,
  totalPayments,
}: ExpenseHealthIndicatorProps) {
  // Define o status de saúde
  const getHealthStatus = () => {
    if (latePaymentsLast6Months === 0) {
      return {
        level: 'excellent',
        label: 'Excelente',
        color: 'bg-green-500',
        icon: CheckCircle,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-200 dark:border-green-900',
      };
    } else if (latePaymentsLast6Months <= 2) {
      return {
        level: 'good',
        label: 'Bom',
        color: 'bg-yellow-500',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        borderColor: 'border-yellow-200 dark:border-yellow-900',
      };
    } else {
      return {
        level: 'poor',
        label: 'Atenção Necessária',
        color: 'bg-red-500',
        icon: AlertCircle,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-900',
      };
    }
  };

  const health = getHealthStatus();
  const Icon = health.icon;
  const onTimeRate = totalPayments > 0 
    ? ((totalPayments - latePaymentsLast6Months) / totalPayments * 100).toFixed(1)
    : 100;

  return (
    <div className={`p-4 rounded-lg border ${health.bgColor} ${health.borderColor}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-background/50`}>
          <Icon className={`h-6 w-6 ${health.iconColor}`} />
        </div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Saúde Financeira da Despesa</h4>
            <Badge 
              className={`${health.color} text-white hover:${health.color}/90`}
            >
              {health.label}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Atrasos (6 meses)</p>
              <p className="font-semibold text-lg">{latePaymentsLast6Months}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Média de atraso</p>
              <p className="font-semibold text-lg">
                {averageDaysLate > 0 ? `${averageDaysLate.toFixed(0)} dias` : '0 dias'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Pontualidade</p>
              <p className="font-semibold text-lg">{onTimeRate}%</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground pt-2 border-t">
            {health.level === 'excellent' && (
              <p>✅ Esta despesa é sempre paga em dia. Continue assim!</p>
            )}
            {health.level === 'good' && (
              <p>⚠️ Alguns atrasos ocasionais nos últimos meses. Monitore os prazos.</p>
            )}
            {health.level === 'poor' && (
              <p>🚨 Muitos atrasos recentes. Recomenda-se revisão urgente desta despesa.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
