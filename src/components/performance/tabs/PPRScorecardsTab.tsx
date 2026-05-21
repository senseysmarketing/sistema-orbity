import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Save, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePPRPeriodData, type Scorecard, type Employee } from "@/hooks/usePPRPeriodData";
import type { BonusPeriod } from "@/hooks/useBonusPeriods";

interface Props { period: BonusPeriod; isAdmin: boolean; }

const CRITERIA = [
  { field: "nps_retention_score" as const, label: "NPS e Retenção", weight: 4 },
  { field: "technical_delivery_score" as const, label: "Entrega Técnica", weight: 4 },
  { field: "process_innovation_score" as const, label: "Processos e Inovação", weight: 2 },
];

function calcAvg(s: Partial<Scorecard>) {
  const a = Number(s.nps_retention_score || 0);
  const b = Number(s.technical_delivery_score || 0);
  const c = Number(s.process_innovation_score || 0);
  return (a * 4 + b * 4 + c * 2) / 10;
}

export function PPRScorecardsTab({ period, isAdmin }: Props) {
  const { employees, scorecards } = usePPRPeriodData(period.id, period.agency_id);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "draft" | "submitted">("all");
  const isClosed = period.status === "closed";

  const scMap = useMemo(() => {
    const m = new Map<string, Scorecard>();
    (scorecards.data || []).forEach((s) => m.set(s.employee_id, s));
    return m;
  }, [scorecards.data]);

  const eligible = (employees.data || []).filter((e) => e.is_active && e.eligible_for_ppr);

  const filtered = eligible.filter((e) => {
    if (filter === "all") return true;
    const sc = scMap.get(e.id);
    if (filter === "draft") return !sc || sc.status === "draft";
    if (filter === "submitted") return sc?.status === "submitted" || sc?.status === "locked";
    return true;
  });

  const upsert = async (employee: Employee, patch: Partial<Scorecard>, status?: string) => {
    const existing = scMap.get(employee.id);
    const merged = {
      nps_retention_score: existing?.nps_retention_score ?? 0,
      technical_delivery_score: existing?.technical_delivery_score ?? 0,
      process_innovation_score: existing?.process_innovation_score ?? 0,
      notes: existing?.notes ?? null,
      ...patch,
    } as any;
    const weighted = calcAvg(merged);
    const payload: any = {
      agency_id: period.agency_id,
      period_id: period.id,
      employee_id: employee.id,
      user_id: employee.user_id ?? null,
      nps_retention_score: merged.nps_retention_score,
      technical_delivery_score: merged.technical_delivery_score,
      process_innovation_score: merged.process_innovation_score,
      notes: merged.notes,
      weighted_average: weighted,
      updated_at: new Date().toISOString(),
    };
    if (status) {
      payload.status = status;
      if (status === "submitted") payload.submitted_at = new Date().toISOString();
    }
    if (existing) {
      const { error } = await supabase.from("employee_scorecards").update(payload).eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("employee_scorecards").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    qc.invalidateQueries({ queryKey: ["ppr-scorecards", period.id] });
    qc.invalidateQueries({ queryKey: ["ppr-bonus-periods"] });
    if (status) toast.success(status === "submitted" ? "Enviado" : "Salvo");
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-medium">Scorecards do período</h3>
          <div className="flex items-center gap-1">
            {(["all", "draft", "submitted"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Todos" : f === "draft" ? "Pendentes" : "Enviados"}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((emp) => {
            const sc = scMap.get(emp.id);
            const status = sc?.status ?? "draft";
            const locked = isClosed || status === "locked";
            const avg = sc ? calcAvg(sc) : 0;
            return (
              <Card key={emp.id} className="border">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role || "Colaborador"} · peso {emp.eligibility_weight}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                      <Badge variant="outline" className="text-[10px]">
                        {locked ? "Travado" : status === "submitted" ? "Enviado" : "Rascunho"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">Média: {avg.toFixed(1)}</Badge>
                    </div>
                  </div>

                  {CRITERIA.map((c) => (
                    <div key={c.field}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          {c.label} <span className="text-[10px]">(peso {c.weight})</span>
                        </span>
                        {isAdmin && !locked ? (
                          <Input
                            type="number" min={0} max={10} step={0.5}
                            value={sc?.[c.field] ?? 0}
                            onChange={(e) => upsert(emp, { [c.field]: Number(e.target.value) } as any)}
                            className="w-20 h-7 text-xs text-right"
                          />
                        ) : (
                          <span className="text-sm font-medium">{sc?.[c.field] ?? 0}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {isAdmin && !locked && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline" size="sm" className="flex-1"
                        onClick={() => upsert(emp, {}, "draft")}
                      >
                        <Save className="h-3 w-3 mr-1" /> Rascunho
                      </Button>
                      <Button
                        size="sm" className="flex-1"
                        onClick={() => upsert(emp, {}, "submitted")}
                      >
                        <Send className="h-3 w-3 mr-1" /> Enviar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum colaborador elegível.</p>
        )}
      </CardContent>
    </Card>
  );
}
