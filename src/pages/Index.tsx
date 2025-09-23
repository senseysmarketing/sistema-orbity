import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, CheckSquare, Users, Calendar, Plus, TrendingUp, AlertCircle, 
  Target, BarChart3, Activity, Clock, DollarSign, Briefcase, Monitor, 
  Palette, TrendingDown, Filter, Search, ArrowUpIcon, ArrowDownIcon,
  Bell, Eye, Building, UserCheck, Timer, Zap, AlertTriangle, Award,
  FileText, PlayCircle, PauseCircle, CheckCircleIcon, XCircle,
  MessageSquare, Coffee, Star, Layers, Banknote, Wallet
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DashboardData {
  tasks: any[];
  personalTasks: any[];
  clients: any[];
  profiles: any[];
  clientPayments: any[];
  expenses: any[];
  salaries: any[];
  trafficControls: any[];
}

const Index = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("week");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [data, setData] = useState<DashboardData>({
    tasks: [],
    personalTasks: [],
    clients: [],
    profiles: [],
    clientPayments: [],
    expenses: [],
    salaries: [],
    trafficControls: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;
    
    try {
      setLoading(true);
      
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Buscar dados com base no role
      const promises = [];

      // Dados comuns para todos os roles
      promises.push(
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*'),
        supabase.from('profiles').select('*')
      );

      // Tarefas pessoais (todos podem ver as próprias)
      promises.push(
        supabase.from('personal_tasks').select('*').eq('user_id', profile.user_id)
      );

      // Dados específicos por role
      if (profile.role === 'administrador') {
        promises.push(
          supabase.from('client_payments').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('salaries').select('*'),
          supabase.from('traffic_controls').select('*')
        );
      } else if (profile.role === 'gestor_trafego') {
        promises.push(
          supabase.from('traffic_controls').select('*')
        );
      }

      const results = await Promise.all(promises);
      
      setData({
        tasks: results[0]?.data || [],
        clients: results[1]?.data || [],
        profiles: results[2]?.data || [],
        personalTasks: results[3]?.data || [],
        clientPayments: profile.role === 'administrador' ? (results[4]?.data || []) : [],
        expenses: profile.role === 'administrador' ? (results[5]?.data || []) : [],
        salaries: profile.role === 'administrador' ? (results[6]?.data || []) : [],
        trafficControls: (profile.role === 'administrador' || profile.role === 'gestor_trafego') ? 
          (results[profile.role === 'administrador' ? 7 : 4]?.data || []) : []
      });

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Métricas calculadas
  const metrics = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Tarefas
    const myTasks = data.tasks.filter(t => t.assigned_to === profile?.user_id);
    const overdueTasks = myTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate < today && t.status !== 'done';
    });
    const todayTasks = myTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate.toDateString() === today.toDateString();
    });
    const weekTasks = myTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate <= thisWeek && dueDate >= today;
    });

    // Tarefas pessoais
    const overduePersonalTasks = data.personalTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate < today && !t.completed;
    });

    // Clientes
    const activeClients = data.clients.filter(c => c.active);
    const monthlyRevenue = activeClients.reduce((sum, c) => sum + (c.monthly_value || 0), 0);

    // Pagamentos (apenas admin)
    const overduePayments = data.clientPayments.filter(p => {
      const dueDate = new Date(p.due_date);
      return dueDate < today && p.status === 'pending';
    });
    const thisMonthPayments = data.clientPayments.filter(p => {
      const dueDate = new Date(p.due_date);
      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
    });
    const paidThisMonth = thisMonthPayments.filter(p => p.status === 'paid');
    const pendingThisMonth = thisMonthPayments.filter(p => p.status === 'pending');

    // Gastos (apenas admin)
    const thisMonthExpenses = data.expenses.filter(e => {
      const dueDate = new Date(e.due_date);
      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
    });
    const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Salários (apenas admin)
    const thisMonthSalaries = data.salaries.filter(s => {
      const dueDate = new Date(s.due_date);
      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
    });
    const totalSalaries = thisMonthSalaries.reduce((sum, s) => sum + parseFloat(s.amount), 0);

    // Tráfego
    const activeTrafficControls = data.trafficControls.length;
    const totalBudget = data.trafficControls.reduce((sum, tc) => sum + (tc.daily_budget || 0), 0);

    // Performance
    const completedTasks = myTasks.filter(t => t.status === 'done').length;
    const taskCompletionRate = myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 0;

    const completedPersonalTasks = data.personalTasks.filter(t => t.completed).length;
    const personalTaskCompletionRate = data.personalTasks.length > 0 ? 
      Math.round((completedPersonalTasks / data.personalTasks.length) * 100) : 0;

    return {
      // Tarefas
      totalTasks: myTasks.length,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      weekTasks: weekTasks.length,
      taskCompletionRate,
      
      // Tarefas pessoais
      totalPersonalTasks: data.personalTasks.length,
      overduePersonalTasks: overduePersonalTasks.length,
      personalTaskCompletionRate,
      
      // Clientes
      totalClients: data.clients.length,
      activeClients: activeClients.length,
      monthlyRevenue,
      
      // Financeiro (admin)
      overduePayments: overduePayments.length,
      thisMonthPayments: thisMonthPayments.length,
      paidThisMonth: paidThisMonth.length,
      pendingThisMonth: pendingThisMonth.length,
      totalExpenses,
      totalSalaries,
      
      // Tráfego
      activeTrafficControls,
      totalBudget,
      
      // Alertas
      totalAlerts: overdueTasks.length + overduePersonalTasks.length + overduePayments.length
    };
  }, [data, profile]);

  const getRoleGreeting = () => {
    if (!profile) return "Bem-vindo";
    switch (profile.role) {
      case 'gestor_trafego':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 📊`;
      case 'designer':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 🎨`;
      case 'administrador':
        return `Bem-vindo, ${profile.name.split(' ')[0]}! 👑`;
      default:
        return `Bem-vindo, ${profile.name.split(' ')[0]}!`;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Dashboard do Administrador
  if (profile?.role === 'administrador') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getRoleGreeting()}
            </h1>
            <p className="text-muted-foreground">
              Visão geral completa da agência e métricas administrativas
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
            <TabsTrigger value="team">Equipe</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* KPIs Principais */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.monthlyRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.activeClients} clientes ativos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.pendingThisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.overduePayments} em atraso
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tarefas Críticas</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{metrics.overdueTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.todayTasks} para hoje
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activeTrafficControls}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(metrics.totalBudget)}/dia budget
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos e Métricas */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance da Equipe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Conclusão - Tarefas</span>
                      <span>{metrics.taskCompletionRate}%</span>
                    </div>
                    <Progress value={metrics.taskCompletionRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pagamentos Recebidos</span>
                      <span>{metrics.thisMonthPayments > 0 ? Math.round((metrics.paidThisMonth / metrics.thisMonthPayments) * 100) : 0}%</span>
                    </div>
                    <Progress value={metrics.thisMonthPayments > 0 ? (metrics.paidThisMonth / metrics.thisMonthPayments) * 100 : 0} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Receita Prevista</span>
                    <span className="font-medium text-green-600">{formatCurrency(metrics.monthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gastos Mensais</span>
                    <span className="font-medium text-red-600">{formatCurrency(metrics.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Salários</span>
                    <span className="font-medium text-blue-600">{formatCurrency(metrics.totalSalaries)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Lucro Estimado</span>
                      <span className={metrics.monthlyRevenue - metrics.totalExpenses - metrics.totalSalaries >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(metrics.monthlyRevenue - metrics.totalExpenses - metrics.totalSalaries)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertas e Ações */}
            {metrics.totalAlerts > 0 && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <Bell className="h-5 w-5" />
                    Alertas Importantes ({metrics.totalAlerts})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {metrics.overdueTasks > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>{metrics.overdueTasks} tarefas em atraso</span>
                    </div>
                  )}
                  {metrics.overduePayments > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      <span>{metrics.overduePayments} pagamentos em atraso</span>
                    </div>
                  )}
                  {metrics.overduePersonalTasks > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckSquare className="h-4 w-4 text-red-500" />
                      <span>{metrics.overduePersonalTasks} tarefas pessoais atrasadas</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5" />
                    Recebimentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.paidThisMonth}</div>
                  <p className="text-xs text-muted-foreground">Pagamentos recebidos este mês</p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pendentes:</span>
                      <span className="text-orange-600">{metrics.pendingThisMonth}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Em atraso:</span>
                      <span className="text-red-600">{metrics.overduePayments}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Gastos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">Despesas deste mês</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Salários:</span>
                      <span>{formatCurrency(metrics.totalSalaries)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Margem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${metrics.monthlyRevenue - metrics.totalExpenses - metrics.totalSalaries >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(metrics.monthlyRevenue - metrics.totalExpenses - metrics.totalSalaries)}
                  </div>
                  <p className="text-xs text-muted-foreground">Lucro líquido estimado</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Margem:</span>
                      <span>{metrics.monthlyRevenue > 0 ? Math.round(((metrics.monthlyRevenue - metrics.totalExpenses - metrics.totalSalaries) / metrics.monthlyRevenue) * 100) : 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">Tarefas atribuídas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Para Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{metrics.todayTasks}</div>
                  <p className="text-xs text-muted-foreground">Vencimento hoje</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Esta Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{metrics.weekTasks}</div>
                  <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Atrasadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</div>
                  <p className="text-xs text-muted-foreground">Precisam atenção</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance da Equipe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.profiles.map((member) => {
                    const memberTasks = data.tasks.filter(t => t.assigned_to === member.user_id);
                    const completedTasks = memberTasks.filter(t => t.status === 'done').length;
                    const completionRate = memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0;
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold">{member.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{completedTasks}/{memberTasks.length}</p>
                          <p className="text-sm text-muted-foreground">{completionRate}% conclusão</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Clientes Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activeClients}</div>
                  <p className="text-xs text-muted-foreground">De {metrics.totalClients} cadastrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Receita Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.monthlyRevenue)}</div>
                  <p className="text-xs text-muted-foreground">Valor total contratado</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Ticket Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.activeClients > 0 ? metrics.monthlyRevenue / metrics.activeClients : 0)}</div>
                  <p className="text-xs text-muted-foreground">Por cliente ativo</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {data.profiles.map((member) => {
                const memberTasks = data.tasks.filter(t => t.assigned_to === member.user_id);
                const completedTasks = memberTasks.filter(t => t.status === 'done').length;
                const overdueTasks = memberTasks.filter(t => {
                  const dueDate = t.due_date ? new Date(t.due_date) : null;
                  return dueDate && dueDate < new Date() && t.status !== 'done';
                }).length;

                return (
                  <Card key={member.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold">{member.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-base">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Tarefas Total:</span>
                        <span className="font-medium">{memberTasks.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Concluídas:</span>
                        <span className="font-medium text-green-600">{completedTasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Em Atraso:</span>
                        <span className="font-medium text-red-600">{overdueTasks}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Performance:</span>
                          <span>{memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0}%</span>
                        </div>
                        <Progress value={memberTasks.length > 0 ? (completedTasks / memberTasks.length) * 100 : 0} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Dashboard do Gestor de Tráfego
  if (profile?.role === 'gestor_trafego') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {getRoleGreeting()}
            </h1>
            <p className="text-muted-foreground">
              Gestão de campanhas, tráfego pago e performance digital
            </p>
          </div>
        </div>

        <Tabs defaultValue="campaigns" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
            <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
            <TabsTrigger value="personal">Tarefas Pessoais</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Campanhas Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activeTrafficControls}</div>
                  <p className="text-xs text-muted-foreground">Em execução</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Budget Diário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(metrics.totalBudget)}</div>
                  <p className="text-xs text-muted-foreground">Total investido/dia</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Clientes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activeClients}</div>
                  <p className="text-xs text-muted-foreground">Com campanhas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Minhas Tarefas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">{metrics.overdueTasks} atrasadas</p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Campanhas */}
            <Card>
              <CardHeader>
                <CardTitle>Campanhas em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                {data.trafficControls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma campanha cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.trafficControls.map((campaign) => {
                      const client = data.clients.find(c => c.id === campaign.client_id);
                      return (
                        <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <h3 className="font-semibold">{client?.name}</h3>
                            <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Budget: {formatCurrency(campaign.daily_budget || 0)}/dia</span>
                              <span>Plataformas: {campaign.platforms?.join(', ') || 'Não informado'}</span>
                              <span>Status: {campaign.situation || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={campaign.results === 'good' ? 'default' : campaign.results === 'average' ? 'secondary' : 'destructive'}>
                              {campaign.results === 'good' ? 'Bom' : campaign.results === 'average' ? 'Médio' : campaign.results === 'poor' ? 'Ruim' : 'N/A'}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                  <p className="text-xs text-muted-foreground">Tarefas atribuídas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Para Hoje</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{metrics.todayTasks}</div>
                  <p className="text-xs text-muted-foreground">Vencimento hoje</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Esta Semana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{metrics.weekTasks}</div>
                  <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.taskCompletionRate}%</div>
                  <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Progresso das Tarefas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conclusão Geral</span>
                    <span>{metrics.taskCompletionRate}%</span>
                  </div>
                  <Progress value={metrics.taskCompletionRate} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalPersonalTasks}</div>
                  <p className="text-xs text-muted-foreground">Tarefas pessoais</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Concluídas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{data.personalTasks.filter(t => t.completed).length}</div>
                  <p className="text-xs text-muted-foreground">Finalizadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{metrics.personalTaskCompletionRate}%</div>
                  <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tarefas Profissionais</span>
                      <span>{metrics.taskCompletionRate}%</span>
                    </div>
                    <Progress value={metrics.taskCompletionRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tarefas Pessoais</span>
                      <span>{metrics.personalTaskCompletionRate}%</span>
                    </div>
                    <Progress value={metrics.personalTaskCompletionRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campanhas por Resultado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['good', 'average', 'poor'].map(result => {
                      const count = data.trafficControls.filter(tc => tc.results === result).length;
                      const percentage = data.trafficControls.length > 0 ? (count / data.trafficControls.length) * 100 : 0;
                      return (
                        <div key={result} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{result === 'good' ? 'Bom' : result === 'average' ? 'Médio' : 'Ruim'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{count}</span>
                            <div className="w-20 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${result === 'good' ? 'bg-green-500' : result === 'average' ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Dashboard do Designer
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {getRoleGreeting()}
          </h1>
          <p className="text-muted-foreground">
            Suas criações, projetos e tarefas de design
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="personal">Tarefas Pessoais</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Métricas Principais */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Projetos Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                <p className="text-xs text-muted-foreground">Tarefas atribuídas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Para Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{metrics.todayTasks}</div>
                <p className="text-xs text-muted-foreground">Entregas hoje</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.weekTasks}</div>
                <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.taskCompletionRate}%</div>
                <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
              </CardContent>
            </Card>
          </div>

          {/* Progresso e Produtividade */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Progresso dos Projetos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Projetos Concluídos</span>
                    <span>{metrics.taskCompletionRate}%</span>
                  </div>
                  <Progress value={metrics.taskCompletionRate} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tarefas Pessoais</span>
                    <span>{metrics.personalTaskCompletionRate}%</span>
                  </div>
                  <Progress value={metrics.personalTaskCompletionRate} className="h-3" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Métricas de Produtividade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Projetos Concluídos</span>
                  <span className="font-medium text-green-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'done').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Em Andamento</span>
                  <span className="font-medium text-blue-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'in_progress').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Aguardando Revisão</span>
                  <span className="font-medium text-orange-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'em_revisao').length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Em Atraso</span>
                  <span className="font-medium text-red-600">{metrics.overdueTasks}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas específicos do designer */}
          {(metrics.overdueTasks > 0 || metrics.todayTasks > 0) && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <Clock className="h-5 w-5" />
                  Deadlines Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {metrics.todayTasks > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Timer className="h-4 w-4 text-orange-500" />
                    <span>{metrics.todayTasks} projetos com entrega hoje</span>
                  </div>
                )}
                {metrics.overdueTasks > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>{metrics.overdueTasks} projetos em atraso</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">A Fazer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'todo').length}</div>
                <p className="text-xs text-muted-foreground">Projetos novos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'in_progress').length}</div>
                <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Em Revisão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'em_revisao').length}</div>
                <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.tasks.filter(t => t.assigned_to === profile?.user_id && t.status === 'done').length}</div>
                <p className="text-xs text-muted-foreground">Entregues</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPersonalTasks}</div>
                <p className="text-xs text-muted-foreground">Tarefas pessoais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Concluídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.personalTasks.filter(t => t.completed).length}</div>
                <p className="text-xs text-muted-foreground">Finalizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{metrics.personalTaskCompletionRate}%</div>
                <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organização Pessoal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso Geral</span>
                  <span>{metrics.personalTaskCompletionRate}%</span>
                </div>
                <Progress value={metrics.personalTaskCompletionRate} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;