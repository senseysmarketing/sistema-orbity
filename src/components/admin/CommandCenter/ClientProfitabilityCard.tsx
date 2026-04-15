import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ClientProfitabilityItem } from "@/hooks/useFinancialMetrics";
import type { Client } from "@/hooks/useFinancialMetrics";

interface ClientProfitabilityCardProps {
  clients: ClientProfitabilityItem[];
  allClients?: Client[];
  selectedMonth?: string;
  className?: string;
}

export function ClientProfitabilityCard({ clients, allClients, selectedMonth, className }: ClientProfitabilityCardProps) {
  const { activeCount, lostMRR } = useMemo(() => {
    if (!allClients || !selectedMonth) return { activeCount: 0, lostMRR: 0 };
    const [year, month] = selectedMonth.split('-').map(Number);
    const active = allClients.filter(c => c.active).length;
    const lost = allClients
      .filter(c => {
        if (!c.cancelled_at) return false;
        const d = new Date(c.cancelled_at);
        return d.getFullYear() === year && d.getMonth() === month - 1;
      })
      .reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    return { activeCount: active, lostMRR: lost };
  }, [allClients, selectedMonth]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Rentabilidade por Cliente
        </CardTitle>
        {allClients && selectedMonth && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {activeCount} Ativos
            </span>
            {lostMRR > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Churn: {formatCurrency(lostMRR)}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent <CardContent className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente ativo</p>
        ) : (
          clients.map(client => (
            <div key={client.id} className="space-y-1.5 p-2 rounded-md hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  {client.isAtRisk && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                  {client.name}
                </span>
                <span className={`text-xs font-semibold ${client.margin >= 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {client.margin.toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fee: {formatCurrency(client.fee)}</span>
                <span>Custo: {formatCurrency(client.estimatedCost)}</span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, client.margin))}
                className={`h-1.5 ${client.isAtRisk ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
