import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { ClientProfitabilityItem } from "@/hooks/useFinancialMetrics";

interface ClientProfitabilityCardProps {
  clients: ClientProfitabilityItem[];
  className?: string;
}

export function ClientProfitabilityCard({ clients, className }: ClientProfitabilityCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Rentabilidade por Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
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
