import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";

interface Lead {
  id: string;
  name: string;
  status: string;
  status_changed_at?: string | null;
  created_at: string;
}

interface CRMSalesVelocityProps {
  leads: Lead[];
}

const STAGE_ORDER = ["leads", "em_contato", "qualified", "scheduled", "meeting", "proposal"];
const STAGE_LABELS: Record<string, string> = {
  leads: "Leads",
  em_contato: "Em contato",
  qualified: "Qualificados",
  scheduled: "Agendamentos",
  meeting: "Reuniões",
  proposal: "Propostas",
};

const STALE_THRESHOLD_DAYS: Record<string, number> = {
  leads: 14,
  em_contato: 7,
  qualified: 7,
  scheduled: 5,
  meeting: 5,
  proposal: 7,
};

export function CRMSalesVelocity({ leads }: CRMSalesVelocityProps) {
  const stageData = useMemo(() => {
    const now = new Date();

    return STAGE_ORDER.map((stage) => {
      const stageLeads = leads.filter(
        (l) => normalizeLeadStatusToDb(l.status) === stage
      );

      const daysInStage = stageLeads.map((l) => {
        const changedAt = l.status_changed_at
          ? new Date(l.status_changed_at)
          : new Date(l.created_at);
        return Math.floor((now.getTime() - changedAt.getTime()) / (1000 * 60 * 60 * 24));
      });

      const avgDays =
        daysInStage.length > 0
          ? Math.round(daysInStage.reduce((a, b) => a + b, 0) / daysInStage.length)
          : 0;

      const threshold = STALE_THRESHOLD_DAYS[stage] || 7;
      const staleCount = daysInStage.filter((d) => d > threshold).length;

      return {
        stage,
        label: STAGE_LABELS[stage] || stage,
        count: stageLeads.length,
        avgDays,
        staleCount,
        threshold,
      };
    });
  }, [leads]);

  const totalStale = stageData.reduce((s, d) => s + d.staleCount, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Sales Velocity
          </CardTitle>
          {totalStale > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalStale} lead{totalStale > 1 ? "s" : ""} travado{totalStale > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="grid grid-cols-4 text-xs font-medium text-muted-foreground pb-2 border-b">
            <span>Etapa</span>
            <span className="text-center">Leads</span>
            <span className="text-center">Tempo Médio</span>
            <span className="text-center">Travados</span>
          </div>
          {stageData.map((row) => (
            <div
              key={row.stage}
              className="grid grid-cols-4 items-center py-2 text-sm border-b border-border/50 last:border-0"
            >
              <span className="font-medium truncate">{row.label}</span>
              <span className="text-center text-muted-foreground">{row.count}</span>
              <span className="text-center">
                {row.count > 0 ? (
                  <span className={row.avgDays > row.threshold ? "text-destructive font-semibold" : ""}>
                    {row.avgDays}d
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </span>
              <span className="text-center">
                {row.staleCount > 0 ? (
                  <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                    <AlertTriangle className="h-3 w-3" />
                    {row.staleCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          "Travados" = leads acima do limite de dias por etapa (ex: Proposta &gt; {STALE_THRESHOLD_DAYS.proposal}d).
        </p>
      </CardContent>
    </Card>
  );
}
