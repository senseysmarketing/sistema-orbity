import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePPRAuditLogs } from "@/hooks/usePPRAuditLogs";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props { period: BonusPeriod; }

const ACTION_LABEL: Record<string, string> = {
  period_recalculated: "Recalculado",
  period_closed: "Período fechado",
  period_reopened: "Período reaberto",
  calculation_failed: "Falha no cálculo",
};

export function PPRAuditTab({ period }: Props) {
  const { data, isLoading } = usePPRAuditLogs(period.id);

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <h3 className="text-sm font-medium">Auditoria do período</h3>
        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {!isLoading && (data?.length || 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Sem registros ainda.</p>
        )}
        <div className="space-y-2">
          {(data || []).map((log) => (
            <div key={log.id} className="p-3 rounded-lg border space-y-1">
              <div className="flex items-center justify-between">
                <Badge variant={log.action === "calculation_failed" ? "destructive" : "outline"}>
                  {ACTION_LABEL[log.action] || log.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              {log.details && (
                <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-x-auto max-h-32">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
