import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, RefreshCw, Lightbulb, AlertTriangle, BarChart3, Users, Target, ChevronRight } from "lucide-react";
import { useAIAssist, AnalyticsReviewResult } from "@/hooks/useAIAssist";
import { useAgency } from "@/hooks/useAgency";
import { UserMetrics, ClientMetrics, TypeDistribution } from "./types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AIAnalysisCardProps {
  selectedMonth: Date;
  total: number;
  completed: number;
  completionRate: number;
  previousMonthRate: number;
  overdue: number;
  unassigned: number;
  userMetrics: UserMetrics[];
  clientMetrics: ClientMetrics[];
  typeDistribution: TypeDistribution[];
  tasksPerDay: Record<string, number>;
  isCurrentMonth: boolean;
}

export function AIAnalysisCard({
  selectedMonth,
  total,
  completed,
  completionRate,
  previousMonthRate,
  overdue,
  unassigned,
  userMetrics,
  clientMetrics,
  typeDistribution,
  tasksPerDay,
  isCurrentMonth,
}: AIAnalysisCardProps) {
  const { analyzeTaskPeriod, loading } = useAIAssist();
  const { currentAgency } = useAgency();
  const [result, setResult] = useState<AnalyticsReviewResult | null>(null);
  const [cachedMonth, setCachedMonth] = useState<string>("");

  const monthKey = format(selectedMonth, "yyyy-MM");

  // Clear cache when month changes
  useEffect(() => {
    if (monthKey !== cachedMonth) {
      setResult(null);
    }
  }, [monthKey, cachedMonth]);

  const buildPrompt = (): string => {
    const period = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });
    const lines: string[] = [
      `Período: ${period}${isCurrentMonth ? " (mês atual, em andamento)" : " (mês encerrado)"}`,
      `Total: ${total} tarefas | Concluídas: ${completed} (${completionRate}%) | Atrasadas: ${overdue} | Sem atribuição: ${unassigned}`,
      `Taxa do mês anterior: ${previousMonthRate}%`,
      "",
      "Equipe:",
    ];

    userMetrics
      .sort((a, b) => b.tasksAssigned - a.tasksAssigned)
      .forEach((u) => {
        lines.push(
          `- ${u.name}: ${u.tasksAssigned} tarefas, ${u.tasksCompleted} concluídas (${u.completionRate}%), ${u.overdueCount} atrasada(s), tempo médio ${u.avgTimeToComplete.toFixed(1)} dias, ${u.tasksInReview} em revisão`
        );
      });

    if (clientMetrics.length > 0) {
      lines.push("", "Clientes:");
      clientMetrics
        .sort((a, b) => b.totalTasks - a.totalTasks)
        .slice(0, 10)
        .forEach((c) => {
          lines.push(
            `- ${c.name}: ${c.totalTasks} tarefas, ${c.completedTasks} concluídas (${c.completionRate}%), ${c.overdueTasks} atrasada(s)`
          );
        });
    }

    if (typeDistribution.length > 0) {
      lines.push("", "Distribuição por tipo:");
      typeDistribution.forEach((t) => {
        lines.push(`- ${t.label}: ${t.count} (${t.percentage}%)`);
      });
    }

    const peakDays = Object.entries(tasksPerDay)
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    if (peakDays.length > 0) {
      lines.push("", "Picos de demanda:");
      peakDays.forEach(([day, count]) => {
        lines.push(`- ${day}: ${count} tarefas`);
      });
    }

    return lines.join("\n");
  };

  const handleGenerate = async () => {
    if (total === 0) return;
    const prompt = buildPrompt();
    const res = await analyzeTaskPeriod(prompt, currentAgency?.id);
    if (res) {
      setResult(res);
      setCachedMonth(monthKey);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-500/10 text-green-600 border-green-500/30";
    if (score >= 6) return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    if (score >= 4) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
    return "bg-destructive/10 text-destructive border-destructive/30";
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Análise com IA
          </div>
          {result && (
            <Badge variant="outline" className={`text-sm px-3 py-1 ${getScoreColor(result.performance_score)}`}>
              {result.performance_score}/10 — {result.performance_label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-center space-y-2">
              <Sparkles className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground max-w-md">
                A IA vai analisar a produtividade da equipe, identificar gargalos, sugerir redistribuição de carga e dar recomendações práticas.
              </p>
            </div>
            <Button onClick={handleGenerate} disabled={loading || total === 0} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analisando..." : "Gerar Análise com IA"}
            </Button>
            {total === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa neste período para analisar.</p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Summary */}
            <Section icon={<BarChart3 className="h-4 w-4" />} title="Resumo Executivo" content={result.summary} />

            {/* Workload */}
            <Section icon={<Users className="h-4 w-4" />} title="Distribuição de Carga" content={result.workload_analysis} />

            {/* Bottlenecks */}
            <Section icon={<AlertTriangle className="h-4 w-4" />} title="Gargalos Identificados" content={result.bottlenecks} />

            {/* Client Alerts */}
            <Section icon={<Target className="h-4 w-4" />} title="Alertas de Clientes" content={result.client_alerts} />

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  Sugestões de Melhoria
                </h4>
                <ul className="space-y-1.5">
                  {result.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Gerar nova análise
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ icon, title, content }: { icon: React.ReactNode; title: string; content: string }) {
  if (!content) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-semibold flex items-center gap-2">{icon}{title}</h4>
      <p className="text-sm text-muted-foreground whitespace-pre-line">{content}</p>
    </div>
  );
}
