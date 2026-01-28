import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Clock, AlertTriangle, TrendingDown } from "lucide-react";
import { PostWithAssignments } from "./types";
import { useMemo } from "react";
import { isBefore } from "date-fns";

interface MetricsCardsProps {
  posts: PostWithAssignments[];
  teamSize: number;
  previousMonthCompletionRate?: number;
}

export function MetricsCards({ posts, teamSize, previousMonthCompletionRate }: MetricsCardsProps) {
  const metrics = useMemo(() => {
    const today = new Date();
    const activePosts = posts.filter(p => !p.archived);
    
    const total = activePosts.length;
    const published = activePosts.filter(p => p.status === 'published').length;
    const pendingApproval = activePosts.filter(p => p.status === 'pending_approval');
    const overdue = activePosts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return isBefore(scheduledDate, today) && p.status !== 'published';
    });

    const completionRate = total > 0 ? Math.round((published / total) * 100) : 0;
    const avgPerUser = teamSize > 0 ? Math.round((total / teamSize) * 10) / 10 : 0;

    // Calculate max waiting time for pending approval
    let maxWaitingDays = 0;
    pendingApproval.forEach(post => {
      const scheduledDate = new Date(post.scheduled_date);
      const daysDiff = Math.floor((today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > maxWaitingDays) {
        maxWaitingDays = daysDiff;
      }
    });

    // Count users with overdue posts
    const usersWithOverdue = new Set<string>();
    overdue.forEach(post => {
      post.post_assignments?.forEach(a => usersWithOverdue.add(a.user_id));
    });

    const completionDiff = previousMonthCompletionRate !== undefined 
      ? completionRate - previousMonthCompletionRate 
      : null;

    return {
      total,
      published,
      completionRate,
      avgPerUser,
      pendingCount: pendingApproval.length,
      maxWaitingDays,
      overdueCount: overdue.length,
      usersWithOverdue: usersWithOverdue.size,
      completionDiff,
    };
  }, [posts, teamSize, previousMonthCompletionRate]);

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Total de Postagens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Postagens</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
          <p className="text-xs text-muted-foreground">
            ~{metrics.avgPerUser} por usuário
          </p>
        </CardContent>
      </Card>

      {/* Taxa de Conclusão */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{metrics.completionRate}%</span>
            {metrics.completionDiff !== null && (
              <span className={`text-xs flex items-center gap-0.5 ${
                metrics.completionDiff >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {metrics.completionDiff >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {metrics.completionDiff >= 0 ? '+' : ''}{metrics.completionDiff}%
              </span>
            )}
          </div>
          <Progress value={metrics.completionRate} className="mt-2" />
        </CardContent>
      </Card>

      {/* Aguardando Aprovação */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aguardando Aprovação</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.maxWaitingDays > 0 
              ? `Máx ${metrics.maxWaitingDays}d esperando` 
              : 'Sem pendências longas'}
          </p>
        </CardContent>
      </Card>

      {/* Postagens Atrasadas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Postagens Atrasadas</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${metrics.overdueCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.overdueCount > 0 ? 'text-destructive' : ''}`}>
            {metrics.overdueCount}
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.usersWithOverdue > 0 
              ? `${metrics.usersWithOverdue} usuário(s) afetado(s)` 
              : 'Tudo em dia!'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
