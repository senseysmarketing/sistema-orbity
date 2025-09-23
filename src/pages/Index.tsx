import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  Calendar, 
  Plus, 
  TrendingUp, 
  AlertCircle,
  DollarSign,
  Target,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  Filter,
  Download
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

// Remove unused chart component to avoid TypeScript errors
// TODO: Fix chart component TypeScript issues later
type DashboardData = {
  totalTasks: number;
  completedTasks: number;
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  pendingPayments: number;
  overduePayments: number;
  totalExpenses: number;
  tasksByStatus: { status: string; count: number; color: string }[];
  revenueChart: { month: string; revenue: number; expenses: number }[];
  clientGrowth: { month: string; clients: number }[];
  recentActivities: { id: string; type: string; description: string; time: string; user: string }[];
  alerts: { id: string; type: 'warning' | 'danger' | 'info'; message: string; time: string }[];
};

const Index = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  useEffect(() => {
    if (profile) {
      fetchDashboardData();
    }
  }, [profile, timePeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(timePeriod);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch personal tasks
      const { data: personalTasks } = await supabase
        .from('personal_tasks')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Fetch clients
      const { data: clients } = await supabase
        .from('clients')
        .select('*');

      // Fetch payments
      const { data: payments } = await supabase
        .from('client_payments')
        .select('*, clients(name)')
        .gte('created_at', startDate.toISOString());

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startDate.toISOString());

      // Process data
      const allTasks = [...(tasks || []), ...(personalTasks || [])];
      const completedTasks = allTasks.filter(task => 
        ('completed' in task && task.completed) || 
        ('status' in task && task.status === 'done')
      ).length;
      const activeClients = clients?.filter(client => client.active).length || 0;
      
      const monthlyRevenue = payments?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0) || 0;
      
      const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0;
      const overduePayments = payments?.filter(p => p.status === 'overdue').length || 0;
      
      const totalExpenses = expenses?.filter(e => e.status === 'paid')
        .reduce((sum, e) => sum + e.amount, 0) || 0;

      // Task status distribution
      const tasksByStatus = [
        { 
          status: 'A Fazer', 
          count: allTasks.filter(t => 
            ('status' in t && t.status === 'todo') || 
            ('completed' in t && !t.completed)
          ).length, 
          color: '#ef4444' 
        },
        { 
          status: 'Em Progresso', 
          count: allTasks.filter(t => 'status' in t && t.status === 'in_progress').length, 
          color: '#f59e0b' 
        },
        { 
          status: 'Em Revisão', 
          count: allTasks.filter(t => 'status' in t && t.status === 'em_revisao').length, 
          color: '#8b5cf6' 
        },
        { 
          status: 'Concluído', 
          count: completedTasks, 
          color: '#10b981' 
        }
      ];

      // Generate chart data (mock for demonstration)
      const revenueChart = Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5-i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { month: 'short' }),
        revenue: Math.floor(Math.random() * 50000) + 20000,
        expenses: Math.floor(Math.random() * 30000) + 10000
      }));

      const clientGrowth = Array.from({ length: 6 }, (_, i) => ({
        month: new Date(Date.now() - (5-i) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { month: 'short' }),
        clients: Math.floor(Math.random() * 10) + (activeClients || 0) - 5 + i
      }));

      // Recent activities
      const recentActivities = [
        ...(tasks?.slice(0, 3).map(task => ({
          id: task.id,
          type: 'task',
          description: `Nova tarefa: ${task.title}`,
          time: new Date(task.created_at).toLocaleString('pt-BR'),
          user: 'Sistema'
        })) || []),
        ...(payments?.slice(0, 2).map(payment => ({
          id: payment.id,
          type: 'payment',
          description: `Pagamento recebido: R$ ${payment.amount.toLocaleString('pt-BR')}`,
          time: new Date(payment.created_at).toLocaleString('pt-BR'),
          user: 'Financeiro'
        })) || [])
      ];

      // Alerts
      const alerts = [
        ...(overduePayments > 0 ? [{
          id: 'overdue-payments',
          type: 'danger' as const,
          message: `${overduePayments} pagamento(s) em atraso`,
          time: 'Agora'
        }] : []),
        ...(pendingPayments > 5 ? [{
          id: 'pending-payments',
          type: 'warning' as const,
          message: `${pendingPayments} pagamentos pendentes`,
          time: 'Hoje'
        }] : []),
        ...(allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length > 0 ? [{
          id: 'overdue-tasks',
          type: 'warning' as const,
          message: `${allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length} tarefa(s) atrasada(s)`,
          time: 'Hoje'
        }] : [])
      ];

      setDashboardData({
        totalTasks: allTasks.length,
        completedTasks,
        totalClients: clients?.length || 0,
        activeClients,
        monthlyRevenue,
        pendingPayments,
        overduePayments,
        totalExpenses,
        tasksByStatus,
        revenueChart,
        clientGrowth,
        recentActivities,
        alerts
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const exportData = () => {
    toast({
      title: "Exportar Dados",
      description: "Funcionalidade de exportação em desenvolvimento.",
    });
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="card-modern">
              <CardHeader>
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[50px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl text-gradient font-bold">
            {getRoleGreeting()}
          </h1>
          <p className="text-muted-foreground">
            Visão geral completa da sua agência
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.completedTasks} concluídas ({Math.round((dashboardData.completedTasks / dashboardData.totalTasks) * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.activeClients} ativos
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {dashboardData.monthlyRevenue.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.pendingPayments} pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Itens que precisam de atenção
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Task Status Distribution */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Distribuição de Tarefas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.tasksByStatus.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.status}</span>
                      </div>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue vs Expenses */}
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Receita vs Despesas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboardData.revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Receita" />
                    <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Client Growth */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Crescimento de Clientes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dashboardData.clientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="clients" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-sm">Taxa de Conclusão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((dashboardData.completedTasks / dashboardData.totalTasks) * 100) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Das tarefas criadas
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-sm">Receita por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {Math.round(dashboardData.monthlyRevenue / (dashboardData.activeClients || 1)).toLocaleString('pt-BR')}
                </div>
                <p className="text-xs text-muted-foreground">
                  Média mensal
                </p>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-sm">Margem de Lucro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(((dashboardData.monthlyRevenue - dashboardData.totalExpenses) / dashboardData.monthlyRevenue) * 100) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Este mês
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Performance Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboardData.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Receita" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" name="Despesas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Atividades Recentes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 p-3 bg-muted/30 rounded-lg">
                      <div className={`p-2 rounded-full ${
                        activity.type === 'task' ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'
                      }`}>
                        {activity.type === 'task' ? <CheckSquare className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time} • {activity.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma atividade recente.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Alertas e Notificações</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.alerts.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center space-x-4 p-3 rounded-lg border-l-4 border-l-destructive bg-destructive/5">
                      <AlertCircle className={`h-5 w-5 ${
                        alert.type === 'danger' ? 'text-destructive' : 
                        alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">{alert.time}</p>
                      </div>
                      <Badge variant={alert.type === 'danger' ? 'destructive' : 'secondary'}>
                        {alert.type === 'danger' ? 'Crítico' : alert.type === 'warning' ? 'Atenção' : 'Info'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta no momento.</p>
                  <p className="text-sm mt-2">Tudo está funcionando bem!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Index;