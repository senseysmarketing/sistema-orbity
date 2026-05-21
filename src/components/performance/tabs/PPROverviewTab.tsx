import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PPRSummaryCards } from "../PPRSummaryCards";
import { usePPRPeriodData } from "@/hooks/usePPRPeriodData";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props {
  period: BonusPeriod;
}

export function PPROverviewTab({ period }: Props) {
  const { months, employeeResults, employees } = usePPRPeriodData(period.id, period.agency_id);

  const empMap = new Map((employees.data || []).map((e) => [e.id, e.name]));
  const top = [...(employeeResults.data || [])]
    .sort((a, b) => b.bonus_amount - a.bonus_amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          A meta de lucro é referência de performance da empresa. O bônus é calculado sobre o lucro líquido do período e
          <strong> não é bloqueado caso a meta não seja atingida</strong>.
        </AlertDescription>
      </Alert>

      <PPRSummaryCards period={period} />

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-3">Lucro por mês</h3>
          {months.data && months.data.length > 0 ? (
            <div className="space-y-2">
              {months.data.map((m) => {
                const max = Math.max(...months.data!.map((x) => Math.abs(x.net_profit)), 1);
                const pct = Math.min(100, (Math.abs(m.net_profit) / max) * 100);
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-muted-foreground">
                      {format(parseISO(m.month_start), "MMM/yy", { locale: ptBR })}
                    </div>
                    <div className="flex-1 h-3 bg-muted rounded overflow-hidden">
                      <div
                        className={m.net_profit >= 0 ? "bg-emerald-500 h-full" : "bg-red-400 h-full"}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-32 text-right text-sm font-medium">
                      {formatCurrency(m.net_profit)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados. Recalcule o período.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h3 className="text-sm font-medium mb-3">Top 5 — Bônus calculado</h3>
          {top.length > 0 ? (
            <div className="space-y-2">
              {top.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{empMap.get(e.employee_id) || "Colaborador"}</p>
                    <p className="text-xs text-muted-foreground">
                      Score {e.score_final.toFixed(1)} · peso {e.eligibility_weight}
                    </p>
                  </div>
                  <p className="font-bold text-primary">{formatCurrency(e.bonus_amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem cálculo de bônus ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
