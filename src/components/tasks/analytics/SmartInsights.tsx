import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, Trophy, Users, Clock, Target, CheckCircle, Calendar } from "lucide-react";
import { SmartInsight, UserMetrics, ClientMetrics } from "./types";

interface SmartInsightsProps {
  userMetrics: UserMetrics[];
  clientMetrics: ClientMetrics[];
  completionRate: number;
  unassignedCount: number;
  overdueCount: number;
  totalTasks: number;
  tasksPerDay: Record<string, number>;
  isCurrentMonth: boolean;
}

export function SmartInsights({
  userMetrics,
  clientMetrics,
  completionRate,
  unassignedCount,
  overdueCount,
  totalTasks,
  tasksPerDay,
  isCurrentMonth
}: SmartInsightsProps) {
  const insights: SmartInsight[] = [];

  // Calculate average tasks per user
  const avgTasksPerUser = userMetrics.length > 0 
    ? userMetrics.reduce((sum, u) => sum + u.tasksAssigned, 0) / userMetrics.length 
    : 0;

  // 1. Unassigned tasks alert
  if (unassignedCount > 0) {
    insights.push({
      id: 'unassigned',
      type: 'warning',
      category: 'Atribuição',
      icon: 'users',
      title: 'Tarefas sem Responsável',
      message: `${unassignedCount} tarefa(s) aguardam atribuição de responsável. Atribua para garantir execução.`
    });
  }

  // 2. Overdue tasks critical alert
  const overdueMore3Days = overdueCount;
  if (overdueMore3Days > 0 && isCurrentMonth) {
    insights.push({
      id: 'overdue-critical',
      type: 'alert',
      category: 'Atraso',
      icon: 'clock',
      title: 'Atraso Crítico',
      message: `${overdueMore3Days} tarefa(s) estão atrasadas. Ação urgente necessária para recuperar o cronograma.`
    });
  }

  // 3. Workload imbalance
  const overloadedUsers = userMetrics.filter(u => 
    avgTasksPerUser > 0 && u.tasksAssigned > avgTasksPerUser * 1.4
  );
  if (overloadedUsers.length > 0 && userMetrics.length > 1) {
    const topOverloaded = overloadedUsers[0];
    const percentAbove = Math.round(((topOverloaded.tasksAssigned / avgTasksPerUser) - 1) * 100);
    insights.push({
      id: 'workload-imbalance',
      type: 'info',
      category: 'Distribuição',
      icon: 'users',
      title: 'Distribuição Desigual',
      message: `${topOverloaded.name} tem ${percentAbove}% mais tarefas que a média. Considere redistribuir a carga.`
    });
  }

  // 4. Client needing attention
  const clientsNeedingAttention = clientMetrics.filter(c => c.needsAttention);
  if (clientsNeedingAttention.length > 0 && isCurrentMonth) {
    const worstClient = clientsNeedingAttention.sort((a, b) => a.completionRate - b.completionRate)[0];
    insights.push({
      id: 'client-attention',
      type: 'warning',
      category: 'Cliente',
      icon: 'target',
      title: 'Cliente Precisa de Atenção',
      message: `${worstClient.name} tem ${worstClient.completionRate}% de conclusão e ${worstClient.overdueTasks} tarefa(s) atrasada(s).`
    });
  }

  // 5. Top performer recognition
  const topPerformer = userMetrics
    .filter(u => u.tasksAssigned >= 3) // At least 3 tasks to qualify
    .sort((a, b) => b.completionRate - a.completionRate)[0];
  
  if (topPerformer && topPerformer.completionRate >= 80) {
    insights.push({
      id: 'top-performer',
      type: 'success',
      category: 'Reconhecimento',
      icon: 'trophy',
      title: 'Melhor Performer',
      message: `${topPerformer.name} teve a maior taxa de conclusão (${topPerformer.completionRate}%) este período! Parabéns!`
    });
  }

  // 6. High productivity
  if (completionRate >= 75 && totalTasks >= 5) {
    insights.push({
      id: 'high-productivity',
      type: 'success',
      category: 'Produtividade',
      icon: 'check',
      title: 'Excelente Produtividade',
      message: `A equipe está mantendo uma taxa de conclusão de ${completionRate}%. Ótimo trabalho!`
    });
  }

  // 7. Peak demand detection
  const peakDays = Object.entries(tasksPerDay)
    .filter(([_, count]) => count >= 5)
    .sort(([, a], [, b]) => b - a);
  
  if (peakDays.length > 0 && isCurrentMonth) {
    const [peakDate, peakCount] = peakDays[0];
    insights.push({
      id: 'peak-demand',
      type: 'info',
      category: 'Demanda',
      icon: 'calendar',
      title: 'Pico de Demanda',
      message: `${peakCount} tarefas vencem em ${peakDate}. Considere redistribuir prazos se possível.`
    });
  }

  // 8. Tasks in review for too long
  const usersWithManyInReview = userMetrics.filter(u => u.tasksInReview >= 3);
  if (usersWithManyInReview.length > 0 && isCurrentMonth) {
    insights.push({
      id: 'review-bottleneck',
      type: 'warning',
      category: 'Gargalo',
      icon: 'clock',
      title: 'Gargalo de Revisão',
      message: `${usersWithManyInReview.length} usuário(s) tem 3+ tarefas em revisão. Considere priorizar revisões.`
    });
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'users': return <Users className="h-5 w-5" />;
      case 'clock': return <Clock className="h-5 w-5" />;
      case 'trophy': return <Trophy className="h-5 w-5" />;
      case 'target': return <Target className="h-5 w-5" />;
      case 'check': return <CheckCircle className="h-5 w-5" />;
      case 'calendar': return <Calendar className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getTypeStyles = (type: SmartInsight['type']) => {
    switch (type) {
      case 'alert':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600';
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-600';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600';
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Tudo em ordem!</p>
              <p className="text-sm text-muted-foreground">
                Não há alertas ou recomendações para este período.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights e Recomendações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {insights.slice(0, 6).map((insight) => (
            <div
              key={insight.id}
              className={`flex items-start gap-2 p-3 rounded-lg border ${getTypeStyles(insight.type)}`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {getIcon(insight.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-sm opacity-80">{insight.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
