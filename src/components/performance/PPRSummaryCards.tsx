import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Gift, Target, Percent } from "lucide-react";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props {
  period: BonusPeriod;
}

export function PPRSummaryCards({ period }: Props) {
  const targetPct = period.profit_target > 0
    ? Math.round((period.profit_actual / period.profit_target) * 100)
    : 0;

  const items = [
    {
      icon: TrendingUp,
      label: "Lucro Líquido",
      value: formatCurrency(period.profit_actual || 0),
      sub: `${targetPct}% da meta de referência`,
    },
    {
      icon: Gift,
      label: "Pote do Bônus",
      value: formatCurrency(period.bonus_pool_amount || 0),
      sub: period.bonus_pool_mode === "manual" ? "Valor fixo manual" : `${period.ppr_percent}% do lucro`,
    },
    {
      icon: Target,
      label: "Meta de Lucro (referência)",
      value: formatCurrency(period.profit_target || 0),
      sub: "Não bloqueia o pagamento",
    },
    {
      icon: Percent,
      label: "% PPR",
      value: `${period.ppr_percent}%`,
      sub: period.bonus_pool_mode === "manual" ? "Modo manual ativo" : "Sobre o lucro líquido",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="pt-5 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <it.icon className="h-4 w-4" />
              <span className="text-xs">{it.label}</span>
            </div>
            <p className="text-2xl font-bold">{it.value}</p>
            <p className="text-xs text-muted-foreground">{it.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
