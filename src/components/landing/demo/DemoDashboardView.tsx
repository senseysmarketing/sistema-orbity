import { 
  Users, 
  Target, 
  Calendar, 
  CheckSquare, 
  TrendingUp,
  DollarSign,
  AlertCircle,
  Share2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { demoMetrics, demoActivities, demoTasks, getPriorityColor } from "@/data/demoData";

export function DemoDashboardView() {
  const overdueCount = demoTasks.filter(t => t.status === "pendente" && new Date(t.due_date) < new Date()).length;

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Clientes */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold text-blue-600">{demoMetrics.activeClients}</p>
                <p className="text-xs text-muted-foreground">de {demoMetrics.totalClients} total</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Leads Este Mês</p>
                <p className="text-2xl font-bold text-purple-600">{demoMetrics.totalLeads}</p>
                <p className="text-xs text-green-600">+{demoMetrics.newLeads} novos</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reuniões */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reuniões</p>
                <p className="text-2xl font-bold text-amber-600">{demoMetrics.upcomingMeetings}</p>
                <p className="text-xs text-muted-foreground">próximos 7 dias</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tarefas */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-2xl font-bold text-emerald-600">{demoMetrics.completedTasks}/{demoMetrics.totalTasks}</p>
                <Progress value={demoMetrics.taskCompletionRate} className="h-1 mt-1 w-20" />
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckSquare className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Receita */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Receita Mensal</p>
                <p className="text-xl font-bold">R$ {demoMetrics.monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +12% vs mês anterior
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investimento Ads */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Investimento Ads</p>
                <p className="text-xl font-bold">R$ {demoMetrics.adSpend.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[#1c102f]/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#1c102f]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Posts Publicados</p>
                <p className="text-xl font-bold">{demoMetrics.publishedPosts}</p>
                <p className="text-xs text-muted-foreground">{demoMetrics.scheduledPosts} agendados</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Share2 className="h-5 w-5 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className={overdueCount > 0 ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" : ""}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Alertas</p>
                <p className="text-xl font-bold text-red-600">{overdueCount}</p>
                <p className="text-xs text-red-600">tarefas atrasadas</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Atividades Recentes */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {demoActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 text-xs">
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                    activity.type === "lead" ? "bg-purple-500" :
                    activity.type === "task" ? "bg-green-500" :
                    activity.type === "client" ? "bg-blue-500" :
                    activity.type === "post" ? "bg-pink-500" :
                    "bg-amber-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{activity.description}</p>
                    <p className="text-muted-foreground truncate">{activity.detail}</p>
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Tarefas */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium">Próximas Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {demoTasks.filter(t => t.status !== "concluida").slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  <div className="h-4 w-4 rounded border border-muted-foreground/30 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-muted-foreground truncate">{task.client_name}</p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
