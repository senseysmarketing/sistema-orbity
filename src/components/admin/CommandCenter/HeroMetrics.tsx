import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calculator, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HeroMetricsProps {
  expectedRevenue: number;
  receivedRevenue: number;
  expectedExpenses: number;
  paidExpenses: number;
  projectedProfit: number;
  profitMargin: number;
  overdueAmount: number;
  overdueRate: number;
  isLoading: boolean;
}

export function HeroMetrics({
  expectedRevenue,
  receivedRevenue,
  expectedExpenses,
  paidExpenses,
  projectedProfit,
  profitMargin,
  overdueAmount,
  overdueRate,
  isLoading,
}: HeroMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Faturamento do Mês",
      value: formatCurrency(expectedRevenue),
      icon: TrendingUp,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      badge: (
        <Badge variant="success" className="ml-2 text-xs">
          Recebido: {formatCurrency(receivedRevenue)}
        </Badge>
      ),
    },
    {
      label: "Custos do Mês",
      value: formatCurrency(expectedExpenses),
      icon: TrendingDown,
      iconColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-800",
      badge: (
        <Badge variant="secondary" className="ml-2 text-xs">
          Pago: {formatCurrency(paidExpenses)}
        </Badge>
      ),
    },
    {
      label: "Lucratividade Projetada",
      value: formatCurrency(projectedProfit),
      icon: Calculator,
      iconColor: projectedProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      bgColor: projectedProfit >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30",
      borderColor: projectedProfit >= 0 ? "border-emerald-200 dark:border-emerald-800" : "border-rose-200 dark:border-rose-800",
      badge: (
        <Badge variant={projectedProfit >= 0 ? "default" : "destructive"} className="ml-2 text-xs">
          {profitMargin.toFixed(1)}%
        </Badge>
      ),
    },
    {
      label: "Inadimplência (Atrasos)",
      value: formatCurrency(overdueAmount),
      icon: AlertTriangle,
      iconColor: overdueAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      bgColor: overdueAmount > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/30",
      borderColor: overdueAmount > 0 ? "border-amber-200 dark:border-amber-800" : "border-border",
      badge: overdueAmount > 0 ? (
        <Badge variant="destructive" className="ml-2 text-xs">
          {overdueRate.toFixed(1)}%
        </Badge>
      ) : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => (
        <Card key={i} className={`${m.borderColor} border`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</span>
              <div className={`p-1.5 rounded-md ${m.bgColor}`}>
                <m.icon className={`h-4 w-4 ${m.iconColor}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl font-bold tracking-tight">{m.value}</span>
              {m.badge}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
