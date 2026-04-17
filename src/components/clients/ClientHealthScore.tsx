import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, Settings } from "lucide-react";
import { isBefore, startOfDay, differenceInDays, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_HEALTH_RULES,
  HealthScoreBreakdown,
  HealthScoreResult,
  HealthScoreRules,
} from "@/types/healthScore";

interface ClientHealthScoreProps {
  client: any;
  tasks: any[];
  meetings: any[];
  npsScore?: number | null;
  variant?: "badge" | "circle";
  showHeader?: boolean;
}

type ScoreLevel = {
  label: string;
  color: string;
  strokeColor: string;
  bgColor: string;
  borderColor: string;
  message: string;
};

function resolveRules(client: any): HealthScoreRules {
  const raw = client?.health_score_rules;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_HEALTH_RULES };
  return {
    meeting_frequency_days:
      Number(raw.meeting_frequency_days) > 0
        ? Number(raw.meeting_frequency_days)
        : DEFAULT_HEALTH_RULES.meeting_frequency_days,
    max_overdue_tasks:
      Number.isFinite(Number(raw.max_overdue_tasks)) && Number(raw.max_overdue_tasks) >= 0
        ? Number(raw.max_overdue_tasks)
        : DEFAULT_HEALTH_RULES.max_overdue_tasks,
    min_nps_score:
      Number(raw.min_nps_score) > 0 && Number(raw.min_nps_score) <= 10
        ? Number(raw.min_nps_score)
        : DEFAULT_HEALTH_RULES.min_nps_score,
  };
}

function calculateDynamicScore(
  client: any,
  tasks: any[],
  meetings: any[],
  npsScore?: number | null
): HealthScoreResult {
  const rules = resolveRules(client);
  const today = startOfDay(new Date());

  // === Pilar Reuniões (40 pts) ===
  let meetingsScore = 0;
  if (meetings.length > 0) {
    const pastMeetings = meetings.filter(
      (m) => new Date(m.start_time) <= today
    );
    if (pastMeetings.length > 0) {
      const sorted = [...pastMeetings].sort(
        (a, b) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
      const daysSinceLast = differenceInDays(today, new Date(sorted[0].start_time));
      if (daysSinceLast <= rules.meeting_frequency_days) {
        meetingsScore = 40;
      } else {
        // Penalização proporcional: a cada período extra, perde 10 pts
        const overdueRatio =
          (daysSinceLast - rules.meeting_frequency_days) /
          rules.meeting_frequency_days;
        meetingsScore = Math.max(0, Math.round(40 - overdueRatio * 40));
      }
    } else {
      // Há reuniões, mas todas no futuro: meio pilar
      meetingsScore = 20;
    }
  }

  // === Pilar Entregas (30 pts) ===
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    if (t.status === "done" || t.status === "cancelled" || t.status === "completed")
      return false;
    return isBefore(parseISO(t.due_date), today);
  }).length;

  const excessOverdue = Math.max(0, overdueTasks - rules.max_overdue_tasks);
  const deliveriesScore = Math.max(0, 30 - excessOverdue * 10);

  // === Pilar Satisfação (30 pts) ===
  let satisfactionScore: number;
  if (npsScore == null) {
    satisfactionScore = 20; // neutro
  } else if (npsScore >= rules.min_nps_score) {
    satisfactionScore = 30;
  } else if (npsScore > 6) {
    satisfactionScore = 15;
  } else {
    satisfactionScore = 0;
  }

  const breakdown: HealthScoreBreakdown = {
    meetings: meetingsScore,
    deliveries: deliveriesScore,
    satisfaction: satisfactionScore,
  };

  const score = Math.max(
    0,
    Math.min(100, meetingsScore + deliveriesScore + satisfactionScore)
  );

  return { score, breakdown, rules };
}

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) {
    return {
      label: "Excelente",
      color: "text-emerald-600",
      strokeColor: "#10b981",
      bgColor: "bg-emerald-100",
      borderColor: "border-emerald-200",
      message: "Cliente saudável e engajado. Oportunidade para upsell.",
    };
  }
  if (score >= 50) {
    return {
      label: "Atenção",
      color: "text-amber-600",
      strokeColor: "#f59e0b",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-200",
      message: "Alguns atrasos ou falta de alinhamento. Agende uma reunião.",
    };
  }
  return {
    label: "Crítico",
    color: "text-red-600",
    strokeColor: "#ef4444",
    bgColor: "bg-red-100",
    borderColor: "border-red-200",
    message: "Ação Imediata: Cliente em alto risco de cancelamento.",
  };
}

function HealthGauge({ score, level }: { score: number; level: ScoreLevel }) {
  const radius = 54;
  const strokeWidth = 10;
  const center = 64;
  const totalAngle = 270;
  const startAngle = 135;
  const circumference = (totalAngle / 360) * 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const startPoint = polarToCartesian(startAngle);
  const endAngle = startAngle + totalAngle;
  const endPoint = polarToCartesian(endAngle);
  const largeArc = totalAngle > 180 ? 1 : 0;

  const bgPath = `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 128, height: 128 }}>
        <svg width="128" height="128" viewBox="0 0 128 128">
          <path
            d={bgPath}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={bgPath}
            fill="none"
            stroke={level.strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference - filled}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: 8 }}
        >
          <span className={`text-3xl font-bold ${level.color}`}>{score}</span>
          <span className={`text-xs font-medium ${level.color}`}>{level.label}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[200px] leading-relaxed">
        {level.message}
      </p>
    </div>
  );
}

function RulesLegend({
  rules,
  breakdown,
}: {
  rules: HealthScoreRules;
  breakdown: HealthScoreBreakdown;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Esta nota é calculada com base em 3 pilares para este cliente:
      </p>
      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">📅</span>
          <div className="flex-1">
            <p className="text-sm font-medium">
              Reuniões{" "}
              <span className="text-muted-foreground font-normal">(40%)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Esperado a cada {rules.meeting_frequency_days} dias.
            </p>
            <p className="text-xs font-medium text-foreground mt-0.5">
              {breakdown.meetings}/40 pts
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">✅</span>
          <div className="flex-1">
            <p className="text-sm font-medium">
              Entregas{" "}
              <span className="text-muted-foreground font-normal">(30%)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo de {rules.max_overdue_tasks}{" "}
              {rules.max_overdue_tasks === 1 ? "tarefa" : "tarefas"} em atraso.
            </p>
            <p className="text-xs font-medium text-foreground mt-0.5">
              {breakdown.deliveries}/30 pts
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-base leading-none mt-0.5">⭐</span>
          <div className="flex-1">
            <p className="text-sm font-medium">
              Satisfação{" "}
              <span className="text-muted-foreground font-normal">(30%)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              NPS mínimo de {rules.min_nps_score}.
            </p>
            <p className="text-xs font-medium text-foreground mt-0.5">
              {breakdown.satisfaction}/30 pts
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesDialog({
  open,
  onOpenChange,
  client,
  initialRules,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: any;
  initialRules: HealthScoreRules;
}) {
  const [rules, setRules] = useState<HealthScoreRules>(initialRules);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clients")
        .update({ health_score_rules: rules as any })
        .eq("id", client.id);
      if (error) throw error;
      toast({
        title: "Regras atualizadas",
        description: "A saúde deste cliente foi recalculada.",
      });
      queryClient.invalidateQueries({ queryKey: ["client", client.id] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Erro ao salvar",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar Saúde do Cliente</DialogTitle>
          <DialogDescription>
            Ajuste os critérios de saúde de acordo com o ritmo e contrato deste
            cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="meeting_freq">Frequência ideal de reuniões</Label>
            <Input
              id="meeting_freq"
              type="number"
              min={1}
              value={rules.meeting_frequency_days}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  meeting_frequency_days: Number(e.target.value) || 1,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Em dias. Ex: 15 para quinzenal, 30 para mensal.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="max_overdue">Tolerância de tarefas em atraso</Label>
            <Input
              id="max_overdue"
              type="number"
              min={0}
              value={rules.max_overdue_tasks}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  max_overdue_tasks: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Quantas tarefas podem estar atrasadas sem afetar a nota.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="min_nps">NPS mínimo aceitável</Label>
            <Input
              id="min_nps"
              type="number"
              min={1}
              max={10}
              value={rules.min_nps_score}
              onChange={(e) =>
                setRules((r) => ({
                  ...r,
                  min_nps_score: Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              De 1 a 10. Abaixo deste valor o pilar Satisfação é penalizado.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setRules({ ...DEFAULT_HEALTH_RULES })}
            disabled={saving}
          >
            Restaurar padrão
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientHealthScore({
  client,
  tasks,
  meetings,
  npsScore,
  variant = "badge",
  showHeader = false,
}: ClientHealthScoreProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const result = calculateDynamicScore(client, tasks, meetings, npsScore);
  const level = getScoreLevel(result.score);

  if (variant === "circle") {
    return (
      <div className="w-full flex flex-col items-center">
        {showHeader && (
          <div className="w-full flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Saúde do Cliente
            </h3>
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Como a nota é calculada"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <RulesLegend rules={result.rules} breakdown={result.breakdown} />
                </PopoverContent>
              </Popover>
              <button
                type="button"
                aria-label="Personalizar regras"
                onClick={() => setDialogOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <HealthGauge score={result.score} level={level} />
        {showHeader && (
          <RulesDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            client={client}
            initialRules={result.rules}
          />
        )}
      </div>
    );
  }

  return (
    <Badge
      className={`${level.bgColor} ${level.color} ${level.borderColor} border font-medium hover:opacity-90`}
    >
      {level.label} ({result.score})
    </Badge>
  );
}

export { calculateDynamicScore, getScoreLevel };
