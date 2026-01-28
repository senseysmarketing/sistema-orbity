import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { UserMetrics } from "./types";

interface TeamPerformanceTableProps {
  userMetrics: UserMetrics[];
  isCurrentMonth: boolean;
}

export function TeamPerformanceTable({ userMetrics, isCurrentMonth }: TeamPerformanceTableProps) {
  // Sort by completion rate descending
  const sortedMetrics = [...userMetrics].sort((a, b) => b.completionRate - a.completionRate);
  const maxTasks = Math.max(...userMetrics.map(u => u.tasksAssigned), 1);

  const getRankIcon = (index: number) => {
    if (index === 0 && sortedMetrics[0]?.completionRate >= 70) {
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    }
    return null;
  };

  const getTrendIcon = (rate: number) => {
    if (rate >= 80) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (rate < 50) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (sortedMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance da Equipe
          </CardTitle>
          <CardDescription>
            Ranking de produtividade por membro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarefa atribuída neste período
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Performance da Equipe
        </CardTitle>
        <CardDescription>
          {isCurrentMonth 
            ? "Ranking de produtividade por membro" 
            : "Desempenho da equipe no período selecionado"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Usuário</TableHead>
                <TableHead className="text-center">Atribuídas</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead className="text-center hidden sm:table-cell">Tempo Médio</TableHead>
                <TableHead className="min-w-[100px] hidden md:table-cell">Carga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMetrics.map((user, index) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm truncate max-w-[100px]">
                          {user.name}
                        </span>
                        {user.overdueCount > 0 && (
                          <span className="text-xs text-destructive">
                            {user.overdueCount} atrasada(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{user.tasksAssigned}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-500">{user.tasksCompleted}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(user.completionRate)}
                      <span className={
                        user.completionRate >= 80 
                          ? "text-green-600 font-medium" 
                          : user.completionRate < 50 
                            ? "text-red-600" 
                            : ""
                      }>
                        {user.completionRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {user.avgTimeToComplete > 0 
                        ? `${user.avgTimeToComplete.toFixed(1)} dias` 
                        : '-'
                      }
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(user.tasksAssigned / maxTasks) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {user.tasksAssigned}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
