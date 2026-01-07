import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  BarChart3,
  Users,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  UserCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  created_by: string;
  archived?: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
}

interface TaskAnalyticsProps {
  tasks: Task[];
  profiles: Profile[];
  clients: Client[];
  getAssignedUsers: (taskId: string) => any[];
}

export function TaskAnalytics({ tasks: currentTasks, profiles, clients, getAssignedUsers }: TaskAnalyticsProps) {
  const { currentAgency } = useAgency();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [monthTasks, setMonthTasks] = useState<Task[]>([]);
  const [loadingMonthTasks, setLoadingMonthTasks] = useState(false);
  
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  // Buscar tarefas do mês selecionado (incluindo arquivadas)
  useEffect(() => {
    const fetchMonthTasks = async () => {
      if (!currentAgency?.id) return;
      
      // Se for o mês atual, usa as tarefas passadas por props
      if (isCurrentMonth) {
        setMonthTasks(currentTasks);
        return;
      }
      
      setLoadingMonthTasks(true);
      
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .or(`due_date.gte.${monthStart.toISOString()},created_at.gte.${monthStart.toISOString()}`)
        .or(`due_date.lte.${monthEnd.toISOString()},created_at.lte.${monthEnd.toISOString()}`);
      
      if (!error && data) {
        // Filtrar para pegar apenas tarefas que realmente pertencem ao mês
        const filteredTasks = data.filter(task => {
          const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });
        setMonthTasks(filteredTasks as Task[]);
      }
      
      setLoadingMonthTasks(false);
    };
    
    fetchMonthTasks();
  }, [currentAgency?.id, selectedMonth, isCurrentMonth, currentTasks]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  // Usar monthTasks para analytics
  const tasks = monthTasks;

  const analytics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Estatísticas por status
    const statusStats = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      em_revisao: tasks.filter(t => t.status === 'em_revisao').length,
      done: tasks.filter(t => t.status === 'done').length,
    };

    // Estatísticas por prioridade
    const priorityStats = {
      high: tasks.filter(t => t.priority === 'high').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      low: tasks.filter(t => t.priority === 'low').length,
    };

    // Tarefas vencendo hoje
    const dueToday = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    });

    // Tarefas vencendo amanhã
    const dueTomorrow = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === tomorrow.getTime();
    });

    // Tarefas vencendo esta semana
    const dueThisWeek = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= thisWeek;
    });

    // Tarefas atrasadas
    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    // Tarefas sem atribuição
    const unassignedTasks = tasks.filter(t => getAssignedUsers(t.id).length === 0);

    // Taxa de conclusão
    const total = tasks.length;
    const completed = statusStats.done;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Estatísticas por cliente
    const clientStats: { [key: string]: { name: string; count: number } } = {};
    tasks.forEach(task => {
      if (task.client_id) {
        const client = clients.find(c => c.id === task.client_id);
        if (client) {
          if (!clientStats[task.client_id]) {
            clientStats[task.client_id] = {
              name: client.name,
              count: 0
            };
          }
          clientStats[task.client_id].count++;
        }
      }
    });

    // Estatísticas por usuário
    const userStats: { [key: string]: { name: string; count: number } } = {};
    tasks.forEach(task => {
      const assignedUsers = getAssignedUsers(task.id);
      assignedUsers.forEach(assignment => {
        const userId = assignment.user_id;
        const profile = profiles.find(p => p.user_id === userId);
        if (profile) {
          if (!userStats[userId]) {
            userStats[userId] = {
              name: profile.name,
              count: 0
            };
          }
          userStats[userId].count++;
        }
      });
    });

    return {
      total,
      statusStats,
      priorityStats,
      dueToday,
      dueTomorrow,
      dueThisWeek,
      overdueTasks,
      unassignedTasks,
      completionRate,
      clientStats,
      userStats,
    };
  }, [tasks, clients, profiles, getAssignedUsers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análises e Insights</h2>
          <p className="text-muted-foreground">
            Visão geral do desempenho e status das tarefas
          </p>
        </div>
        
        {/* Seletor de Mês */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center">
            <span className="text-lg font-semibold capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isSameMonth(selectedMonth, new Date())}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Indicador de mês histórico */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Visualizando dados de {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      )}

      {loadingMonthTasks && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Cards principais de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.statusStats.done} concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Atribuição</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.unassignedTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {analytics.overdueTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção urgente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vencimentos próximos / Resumo do Mês */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isCurrentMonth ? "Vencimentos Próximos" : "Resumo do Período"}
            </CardTitle>
            <CardDescription>
              {isCurrentMonth 
                ? "Tarefas com prazo nos próximos dias"
                : `Tarefas do mês de ${format(selectedMonth, "MMMM yyyy", { locale: ptBR })}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hoje</span>
                <Badge variant={analytics.dueToday.length > 0 ? "default" : "secondary"}>
                  {analytics.dueToday.length} tarefas
                </Badge>
              </div>
              {analytics.dueToday.length > 0 && (
                <div className="space-y-1 pl-4">
                  {analytics.dueToday.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {analytics.dueToday.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{analytics.dueToday.length - 3} mais
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amanhã</span>
                <Badge variant="secondary">
                  {analytics.dueTomorrow.length} tarefas
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Esta Semana</span>
                <Badge variant="secondary">
                  {analytics.dueThisWeek.length} tarefas
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {isCurrentMonth ? "Itens que Precisam de Atenção" : "Status das Tarefas"}
            </CardTitle>
            <CardDescription>
              {isCurrentMonth ? "Tarefas com alertas ou pendências" : "Distribuição do período"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.overdueTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">
                    {isCurrentMonth ? "Atrasadas" : "Não concluídas no prazo"}
                  </span>
                  <Badge variant="destructive">
                    {analytics.overdueTasks.length}
                  </Badge>
                </div>
                <div className="space-y-1 pl-4">
                  {analytics.overdueTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))}
                  {analytics.overdueTasks.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{analytics.overdueTasks.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            )}

            {analytics.unassignedTasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sem Atribuição</span>
                  <Badge variant="outline">
                    {analytics.unassignedTasks.length}
                  </Badge>
                </div>
              </div>
            )}

            {analytics.statusStats.todo > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">A Fazer</span>
                  <Badge variant="secondary">
                    {analytics.statusStats.todo}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">A Fazer</span>
              <Badge className="bg-gray-500">{analytics.statusStats.todo}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Em Andamento</span>
              <Badge className="bg-blue-500">{analytics.statusStats.in_progress}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Em Revisão</span>
              <Badge className="bg-purple-500">{analytics.statusStats.em_revisao}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Concluída</span>
              <Badge className="bg-green-500">{analytics.statusStats.done}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Alta</span>
              <Badge className="bg-red-500">{analytics.priorityStats.high}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Média</span>
              <Badge className="bg-yellow-500">{analytics.priorityStats.medium}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Baixa</span>
              <Badge className="bg-gray-500">{analytics.priorityStats.low}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(analytics.clientStats)
              .sort(([, a], [, b]) => b.count - a.count)
              .slice(0, 5)
              .map(([clientId, data]) => (
                <div key={clientId} className="flex items-center justify-between">
                  <span className="text-sm truncate">{data.name}</span>
                  <Badge variant="outline">{data.count}</Badge>
                </div>
              ))}
            {Object.keys(analytics.clientStats).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa com cliente</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Por Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(analytics.userStats)
              .sort(([, a], [, b]) => b.count - a.count)
              .slice(0, 5)
              .map(([userId, data]) => (
                <div key={userId} className="flex items-center justify-between">
                  <span className="text-sm truncate">{data.name}</span>
                  <Badge variant="outline">{data.count}</Badge>
                </div>
              ))}
            {Object.keys(analytics.userStats).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa atribuída</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.overdueTasks.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  Você tem {analytics.overdueTasks.length} tarefa(s) atrasada(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Priorize essas tarefas para manter o cronograma em dia
                </p>
              </div>
            </div>
          )}

          {analytics.unassignedTasks.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {analytics.unassignedTasks.length} tarefa(s) sem responsável
                </p>
                <p className="text-sm text-muted-foreground">
                  Atribua responsáveis para garantir que todas as tarefas sejam executadas
                </p>
              </div>
            </div>
          )}

          {analytics.completionRate >= 75 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Ótimo trabalho! Taxa de conclusão em {analytics.completionRate}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Sua equipe está mantendo um excelente ritmo de produtividade
                </p>
              </div>
            </div>
          )}

          {analytics.dueToday.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {analytics.dueToday.length} tarefa(s) vencem hoje
                </p>
                <p className="text-sm text-muted-foreground">
                  Foque nestas tarefas para cumprir os prazos de hoje
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
