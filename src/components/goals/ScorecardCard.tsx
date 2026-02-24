import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { User, Wand2 } from "lucide-react";

interface ScorecardCardProps {
  employee: { id: string; name: string; role: string | null };
  scorecard: {
    nps_retention_score: number;
    technical_delivery_score: number;
    process_innovation_score: number;
    weighted_average: number;
    max_share: number;
    final_bonus: number;
  } | null;
  poolAmount: number;
  numEmployees: number;
  isAdmin: boolean;
  isBlurred: boolean;
  agencyNps?: number;
  onUpdate: (employeeId: string, field: string, value: number) => void;
}

export function ScorecardCard({
  employee,
  scorecard,
  poolAmount,
  numEmployees,
  isAdmin,
  isBlurred,
  agencyNps,
  onUpdate,
}: ScorecardCardProps) {
  const nps = scorecard?.nps_retention_score || 0;
  const tech = scorecard?.technical_delivery_score || 0;
  const proc = scorecard?.process_innovation_score || 0;
  const avg = scorecard?.weighted_average || ((nps * 4 + tech * 4 + proc * 2) / 10);
  const maxShare = poolAmount / (numEmployees || 1);
  const finalBonus = maxShare * (avg / 10);

  // Normalize agency NPS (-100 to 100) to 0-10 scale
  const normalizedNps = agencyNps !== undefined
    ? Math.round(Math.min(10, Math.max(0, (agencyNps + 100) / 20)) * 10) / 10
    : null;

  const canSuggestNps = isAdmin && normalizedNps !== null && nps === 0 && normalizedNps > 0;

  const criteria = [
    { label: "NPS e Retenção", field: "nps_retention_score", value: nps, weight: 4 },
    { label: "Entrega Técnica", field: "technical_delivery_score", value: tech, weight: 4 },
    { label: "Processos e Inovação", field: "process_innovation_score", value: proc, weight: 2 },
  ];

  return (
    <Card className={`relative transition-all ${isBlurred ? "select-none" : ""}`}>
      {isBlurred && (
        <div className="absolute inset-0 z-10 backdrop-blur-md bg-background/30 rounded-lg flex items-center justify-center">
          <p className="text-sm text-muted-foreground font-medium">{employee.name}</p>
        </div>
      )}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm">{employee.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{employee.role || "Colaborador"}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            Média: {avg.toFixed(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {criteria.map((c) => (
          <div key={c.field}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {c.label} <span className="text-[10px]">(peso {c.weight})</span>
              </span>
              <div className="flex items-center gap-1">
                {c.field === "nps_retention_score" && canSuggestNps && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-primary"
                    onClick={() => onUpdate(employee.id, c.field, normalizedNps!)}
                    title={`Usar NPS da agência (${agencyNps}) → nota ${normalizedNps}`}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Usar NPS
                  </Button>
                )}
                {isAdmin ? (
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={c.value}
                    onChange={(e) => onUpdate(employee.id, c.field, Number(e.target.value))}
                    className="w-16 h-7 text-xs text-right"
                  />
                ) : (
                  <span className="text-sm font-medium">{c.value}</span>
                )}
              </div>
            </div>
            <Progress value={c.value * 10} className="h-2" />
          </div>
        ))}

        <div className="pt-2 border-t flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Fatia máxima</p>
            <p className="text-sm font-medium">{formatCurrency(maxShare)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bônus Final</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(finalBonus)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
