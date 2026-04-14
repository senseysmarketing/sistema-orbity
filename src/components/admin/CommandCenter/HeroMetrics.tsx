import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Calculator, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface HeroMetricsProps {
  totalMRR: number;
  burnRate: number;
  profitability: number;
  profitabilityMargin: number;
  realProfitability: number;
  realProfitabilityMargin: number;
  delinquencyRate: number;
  isLoading: boolean;
}

export function HeroMetrics({ totalMRR, burnRate, profitability, profitabilityMargin, realProfitability, realProfitabilityMargin, delinquencyRate, isLoading }: HeroMetricsProps) {
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
      label: "Receita Recorrente (MRR)",
      value: formatCurrency(totalMRR),
      icon: TrendingUp,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Burn Rate (Custos)",
      value: formatCurrency(burnRate),
      icon: TrendingDown,
      iconColor: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
      borderColor: "border-rose-200 dark:border-rose-800",
    },
    {
      label: "Lucratividade (Caixa)",
      value: formatCurrency(realProfitability),
      icon: Calculator,
      iconColor: realProfitability >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      bgColor: realProfitability >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30",
      borderColor: realProfitability >= 0 ? "border-emerald-200 dark:border-emerald-800" : "border-rose-200 dark:border-rose-800",
      badge: (
        <Badge variant={realProfitability >= 0 ? "default" : "destructive"} className="ml-2 text-xs">
          {realProfitabilityMargin.toFixed(1)}%
        </Badge>
      ),
      subtitle: `Previsto: ${formatCurrency(profitability)} (${profitabilityMargin.toFixed(1)}%)`,
    },
    {
      label: "Inadimplência",
      value: formatCurrency(delinquencyRate),
      icon: AlertTriangle,
      iconColor: delinquencyRate > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
      bgColor: delinquencyRate > 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-muted/30",
      borderColor: delinquencyRate > 0 ? "border-amber-200 dark:border-amber-800" : "border-border",
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
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tracking-tight">{m.value}</span>
              {m.badge}
            </div>
            {m.subtitle && (
              <p className="text-xs text-muted-foreground mt-1.5">{m.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
