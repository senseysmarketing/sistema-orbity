import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, TrendingUp, Users, Calendar, Target,
  MessageSquare, Monitor, FileText, Briefcase, BarChart3,
  CheckSquare, Share2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, format } from 'date-fns';

const Index = () => {
  const { profile } = useAuth();
  const { currentAgency, isAgencyAdmin } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(() => {
    const saved = localStorage.getItem('dashboard_show_sensitive_data');
    // Se não houver preferência salva, padrão é FALSE (oculto)
    return saved !== null ? saved === 'true' : false;
  });

  // Salvar preferência de privacidade no localStorage
  useEffect(() => {
    localStorage.setItem('dashboard_show_sensitive_data', String(showSensitiveData));
  }, [showSensitiveData]);
  const [realAdSpend, setRealAdSpend] = useState(0);
  const [data, setData] = useState({
    clients: [],
    leads: [],
    meetings: [],
    tasks: [],
    socialPosts: [],
    contracts: [],
    payments: [],
    campaigns: [],
  });

  const fetchRealInvestments = useCallback(async () => {
    if (!currentAgency?.id) return;
    
    try {
      let totalSpend = 0;
      
      // 1. Buscar Meta Ads spend da conta selecionada
      const { data: agency } = await supabase
        .from('agencies')
        .select('crm_ad_account_id')
        .eq('id', currentAgency.id)
        .single();

      if (agency?.crm_ad_account_id) {
        const { data: account } = await supabase
          .from('selected_ad_accounts')
          .select('current_month_spend')
          .eq('id', agency.crm_ad_account_id)
          .single();
        
        totalSpend += Number(account?.current_month_spend || 0);
      }

      // 2. Buscar investimentos manuais do mês
      const monthStr = format(startOfMonth(new Date()), 'yyyy-MM-01');
      const { data: manualData } = await supabase
        .from('crm_investments')
        .select('amount')
        .eq('agency_id', currentAgency.id)
        .eq('reference_month', monthStr);
      
      if (manualData) {
        totalSpend += manualData.reduce((sum, inv) => sum + Number(inv.amount), 0);
      }

      setRealAdSpend(totalSpend);
    } catch (error) {
      console.error('Error fetching real investments:', error);
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    fetchDashboardData();
    fetchRealInvestments();
  }, [profile, currentAgency?.id, fetchRealInvestments]);

  const fetchDashboardData = async () => {
    if (!profile || !currentAgency) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      const [
        clientsRes,
        leadsRes,
        meetingsRes,
        tasksRes,
        socialPostsRes,
        contractsRes,
        paymentsRes,
        campaignsRes,
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', currentAgency.id),
        supabase.from('leads').select('*').eq('agency_id', currentAgency.id),
        supabase.from('meetings').select('*').eq('agency_id', currentAgency.id),
        supabase.from('tasks').select('*, clients(name)').eq('agency_id', currentAgency.id),
        supabase.from('social_media_posts').select('*').eq('agency_id', currentAgency.id),
        supabase.from('contracts').select('*').eq('agency_id', currentAgency.id),
        supabase.from('client_payments').select('*').eq('agency_id', currentAgency.id),
        supabase.from('campaigns').select('*').eq('agency_id', currentAgency.id),
      ]);

      setData({
        clients: clientsRes.data || [],
        leads: leadsRes.data || [],
        meetings: meetingsRes.data || [],
        tasks: tasksRes.data || [],
        socialPosts: socialPostsRes.data || [],
        contracts: contractsRes.data || [],
        payments: paymentsRes.data || [],
        campaigns: campaignsRes.data || [],
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

  const metrics = useMemo(() => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Clientes
    const activeClients = data.clients.filter((c: any) => c.active).length;
    
    // Receita Mensal - baseada em pagamentos do mês atual
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
    const startStr = `${selectedMonth}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    
    // Filtrar pagamentos do mês apenas de clientes ativos
    const activeClientIds = data.clients.filter((c: any) => c.active).map((c: any) => c.id);
    const paymentsThisMonth = data.payments.filter((payment: any) => {
      return payment.due_date >= startStr && 
             payment.due_date <= endStr &&
             activeClientIds.includes(payment.client_id);
    });
    
    const monthlyRevenue = paymentsThisMonth.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Leads
    const totalLeads = data.leads.length;
    const convertedLeads = data.leads.filter((l: any) => l.status === 'client').length;

    // Reuniões
    const upcomingMeetings = data.meetings.filter((m: any) => {
      const meetingDate = new Date(m.start_time);
      return meetingDate >= today && m.status !== 'cancelled';
    }).length;
    const thisMonthMeetings = data.meetings.filter((m: any) => {
      const meetingDate = new Date(m.start_time);
      return meetingDate >= thisMonth && meetingDate < nextMonth;
    }).length;

    // Tarefas
    const totalTasks = data.tasks.length;
    const completedTasks = data.tasks.filter((t: any) => t.status === 'done').length;
    const overdueTasks = data.tasks.filter((t: any) => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate < today && t.status !== 'done';
    }).length;

    // Social Media
    const totalSocialPosts = data.socialPosts.length;
    const publishedPosts = data.socialPosts.filter((p: any) => p.status === 'published').length;

    // Investimento em ads (dados reais do CRM)
    const adSpend = realAdSpend;

    return {
      totalClients: data.clients.length,
      activeClients,
      totalLeads,
      convertedLeads,
      totalMeetings: thisMonthMeetings,
      upcomingMeetings,
      totalTasks,
      completedTasks,
      overdueTasks,
      totalSocialPosts,
      publishedPosts,
      monthlyRevenue,
      adSpend,
    };
  }, [data, realAdSpend]);

  // Atividades recentes
  const recentActivities = useMemo(() => {
    const activities = [];

    // Tarefas concluídas recentemente
    const recentCompletedTasks = data.tasks
      .filter((t: any) => t.status === 'done')
      .slice(0, 3)
      .map((t: any) => ({
        id: `task-${t.id}`,
        type: 'task' as const,
        title: t.title,
        description: `Tarefa concluída${t.clients?.name ? ` - ${t.clients.name}` : ''}`,
        timestamp: t.updated_at,
      }));

    // Reuniões recentes
    const recentMeetings = data.meetings
      .filter((m: any) => m.status === 'completed')
      .slice(0, 3)
      .map((m: any) => ({
        id: `meeting-${m.id}`,
        type: 'meeting' as const,
        title: m.title,
        description: `Reunião realizada`,
        timestamp: m.start_time,
      }));

    // Posts publicados
    const recentPosts = data.socialPosts
      .filter((p: any) => p.status === 'published')
      .slice(0, 2)
      .map((p: any) => ({
        id: `post-${p.id}`,
        type: 'post' as const,
        title: p.content?.substring(0, 50) || 'Post publicado',
        description: `Publicado em ${p.platform}`,
        timestamp: p.published_at || p.created_at,
      }));

    // Novos leads
    const recentLeads = data.leads
      .slice(0, 2)
      .map((l: any) => ({
        id: `lead-${l.id}`,
        type: 'lead' as const,
        title: l.name,
        description: `Novo lead - ${l.status}`,
        timestamp: l.created_at,
      }));

    // Contratos criados
    const recentContracts = data.contracts
      .slice(0, 2)
      .map((c: any) => ({
        id: `contract-${c.id}`,
        type: 'contract' as const,
        title: c.client_name,
        description: `Contrato criado`,
        timestamp: c.created_at,
      }));

    return [...recentCompletedTasks, ...recentMeetings, ...recentPosts, ...recentLeads, ...recentContracts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [data]);

  // Próximas tarefas
  const upcomingTasks = useMemo(() => {
    const today = new Date();
    return data.tasks
      .filter((t: any) => {
        const dueDate = t.due_date ? new Date(t.due_date) : null;
        return t.status !== 'done' && dueDate;
      })
      .sort((a: any, b: any) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA.getTime() - dateB.getTime();
      })
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        priority: t.priority || 'medium',
        status: t.status,
        client_name: t.clients?.name,
      }));
  }, [data]);

  const getRoleGreeting = () => {
    if (!profile) return "Bem-vindo";
    const firstName = profile.name.split(' ')[0];
    switch (profile.role) {
      case 'agency_admin':
        return `Olá, ${firstName}! 👋`;
      case 'agency_user':
        return `Olá, ${firstName}! 👋`;
      default:
        return `Olá, ${firstName}!`;
    }
  };

  const getRoleSubtitle = () => {
    if (!profile) return "";
    switch (profile.role) {
      case 'agency_admin':
        return "Visão geral completa da sua agência";
      case 'agency_user':
        return "Suas tarefas e atividades do dia";
      default:
        return "Dashboard principal";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            {getRoleGreeting()}
          </h1>
          <p className="text-muted-foreground mt-1">
            {getRoleSubtitle()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Agência</p>
          <p className="font-semibold">{currentAgency?.name || 'Carregando...'}</p>
        </div>
      </div>

      {/* Métricas Principais */}
      <DashboardMetrics 
        metrics={metrics} 
        showSensitiveData={showSensitiveData}
        onToggleSensitiveData={() => setShowSensitiveData(!showSensitiveData)}
        isAdmin={isAgencyAdmin()}
      />

      {/* Conteúdo por Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="crm">
            <Target className="h-4 w-4 mr-2" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="social">
            <Share2 className="h-4 w-4 mr-2" />
            Social
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <QuickActions />
            <RecentActivity activities={recentActivities} />
          </div>
          
          <UpcomingTasks tasks={upcomingTasks} />
        </TabsContent>

        {/* Tarefas */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.completedTasks} concluídas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tarefas Atrasadas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{metrics.overdueTasks}</div>
                <p className="text-xs text-muted-foreground">
                  Requerem atenção imediata
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance da equipe
                </p>
              </CardContent>
            </Card>
          </div>

          <UpcomingTasks tasks={upcomingTasks} />
          
          <div className="flex justify-end">
            <Button onClick={() => navigate('/dashboard/tasks')}>
              Ver Todas as Tarefas
            </Button>
          </div>
        </TabsContent>

        {/* CRM */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalLeads}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.convertedLeads} convertidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {metrics.totalLeads > 0 ? Math.round((metrics.convertedLeads / metrics.totalLeads) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Lead para cliente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reuniões Agendadas</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{metrics.upcomingMeetings}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalMeetings} no mês
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/crm')}>
              Acessar CRM
            </Button>
            <Button onClick={() => navigate('/dashboard/agenda')}>
              Ver Agenda
            </Button>
          </div>
        </TabsContent>

        {/* Social Media */}
        <TabsContent value="social" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts Criados</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalSocialPosts}</div>
                <p className="text-xs text-muted-foreground">
                  Total de conteúdos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Posts Publicados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.publishedPosts}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalSocialPosts > 0 ? Math.round((metrics.publishedPosts / metrics.totalSocialPosts) * 100) : 0}% do planejado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Publicação</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metrics.totalSocialPosts > 0 ? Math.round((metrics.publishedPosts / metrics.totalSocialPosts) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Performance de entrega
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => navigate('/dashboard/social-media')}>
              Acessar Social Media
            </Button>
          </div>
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metrics.activeClients}</div>
                <p className="text-xs text-muted-foreground">
                  De {metrics.totalClients} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.contracts.filter((c: any) => c.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">
                  {data.contracts.length} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.campaigns.filter((c: any) => c.status === 'active').length}</div>
                <p className="text-xs text-muted-foreground">
                  Tráfego pago rodando
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                  }).format(metrics.monthlyRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Contratos recorrentes
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo de Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Produtividade</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Tarefas concluídas</span>
                      <span>{metrics.completedTasks}/{metrics.totalTasks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Posts publicados</span>
                      <span>{metrics.publishedPosts}/{metrics.totalSocialPosts}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Leads convertidos</span>
                      <span>{metrics.convertedLeads}/{metrics.totalLeads}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Eficiência</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de conclusão de tarefas</span>
                      <span className="text-green-600 font-medium">
                        {metrics.totalTasks > 0 ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de conversão CRM</span>
                      <span className="text-green-600 font-medium">
                        {metrics.totalLeads > 0 ? Math.round((metrics.convertedLeads / metrics.totalLeads) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de publicação</span>
                      <span className="text-green-600 font-medium">
                        {metrics.totalSocialPosts > 0 ? Math.round((metrics.publishedPosts / metrics.totalSocialPosts) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;