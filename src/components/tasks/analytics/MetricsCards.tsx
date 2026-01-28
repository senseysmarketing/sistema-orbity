import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, UserCheck, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricsCardsProps {
  total: number;
  completed: number;
  completionRate: number;
  previousMonthRate: number;
  unassigned: number;
  overdue: number;
  avgPerUser: number;
  usersWithOverdue: number;
}

export function MetricsCards({
  total,
  completed,
  completionRate,
  previousMonthRate,
  unassigned,
  overdue,
  avgPerUser,
  usersWithOverdue
}: MetricsCardsProps) {
  const rateDiff = completionRate - previousMonthRate;
  const rateImproved = rateDiff >= 0;

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">
            {avgPerUser.toFixed(1)} por usuário • {completed} concluídas
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
          {rateImproved ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completionRate}%</div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={completionRate} className="flex-1" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {rateImproved ? '+' : ''}{rateDiff.toFixed(0)}% vs mês anterior
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sem Atribuição</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unassigned}</div>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((unassigned / total) * 100).toFixed(0) : 0}% do total • Requer atenção
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overdue}</div>
          <p className="text-xs text-muted-foreground">
            {usersWithOverdue} usuário(s) afetado(s)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
