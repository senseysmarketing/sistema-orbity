import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMaster } from '@/hooks/useMaster';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  DollarSign, 
  AlertTriangle,
  Clock,
  Award,
  Activity,
  FileText,
  Percent
} from 'lucide-react';

interface MonthlyMetric {
  month: string;
  new_agencies: number;
  converted_to_paid: number;
}

interface AgencyUsage {
  agency_id: string;
  agency_name: string;
  computed_status: string;
  plan_name: string;
  task_count: number;
  post_count: number;
  user_count: number;
  created_at: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  payment_count: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(142, 76%, 36%)',      // green
  trialing: 'hsl(217, 91%, 60%)',     // blue
  trial_expired: 'hsl(0, 84%, 60%)',  // red
  past_due: 'hsl(25, 95%, 53%)',      // orange
  canceled: 'hsl(0, 0%, 45%)',        // gray
  suspended: 'hsl(0, 84%, 40%)',      // dark red
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Em Trial',
  trial_expired: 'Trial Expirado',
  past_due: 'Pagamento Pendente',
  canceled: 'Cancelado',
  suspended: 'Suspenso',
};

export function MasterAnalytics() {
  const { agencies, getStatusCounts, getMasterMetrics } = useMaster();
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
  const [agencyUsage, setAgencyUsage] = useState<AgencyUsage[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const [metricsRes, usageRes, revenueRes] = await Promise.all([
        supabase.from('master_monthly_metrics').select('*'),
        supabase.from('master_agency_usage').select('*'),
        supabase.from('master_monthly_revenue').select('*'),
      ]);

      if (metricsRes.data) {
        setMonthlyMetrics(metricsRes.data as MonthlyMetric[]);
      }
      if (usageRes.data) {
        setAgencyUsage(usageRes.data as AgencyUsage[]);
      }
      if (revenueRes.data) {
        setMonthlyRevenue(revenueRes.data as MonthlyRevenue[]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusCounts = getStatusCounts();
  const masterMetrics = getMasterMetrics();

  // Calculate conversion metrics
  const conversionMetrics = useMemo(() => {
    const totalTrialsFinished = statusCounts.active + statusCounts.trial_expired + statusCounts.canceled;
    const conversionRate = totalTrialsFinished > 0 
      ? (statusCounts.active / totalTrialsFinished) * 100 
      : 0;
    
    const totalActive = statusCounts.active;
    const churnRate = totalActive > 0 
      ? (statusCounts.canceled / (totalActive + statusCounts.canceled)) * 100 
      : 0;
    
    const avgTicket = totalActive > 0 ? masterMetrics.mrr / totalActive : 0;
    const estimatedLTV = avgTicket * 12; // 12 months average lifetime

    return {
      conversionRate,
      churnRate,
      avgTicket,
      estimatedLTV,
      trialExpiredRate: agencies.length > 0 
        ? (statusCounts.trial_expired / agencies.length) * 100 
        : 0,
    };
  }, [statusCounts, masterMetrics, agencies]);

  // Prepare chart data
  const growthChartData = useMemo(() => {
    return [...monthlyMetrics]
      .reverse()
      .map(m => ({
        month: format(parseISO(m.month), 'MMM/yy', { locale: ptBR }),
        novas: m.new_agencies,
        convertidas: m.converted_to_paid,
      }));
  }, [monthlyMetrics]);

  const revenueChartData = useMemo(() => {
    return [...monthlyRevenue]
      .reverse()
      .map(m => ({
        month: format(parseISO(m.month), 'MMM/yy', { locale: ptBR }),
        receita: Number(m.revenue) || 0,
        pagamentos: m.payment_count,
      }));
  }, [monthlyRevenue]);

  const statusChartData = useMemo(() => {
    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || 'hsl(0, 0%, 50%)',
      }));
  }, [statusCounts]);

  // Opportunities: trials expiring soon
  const opportunities = useMemo(() => {
    const now = new Date();
    return agencies
      .filter(a => a.computed_status === 'trialing' && a.trial_end)
      .map(a => ({
        ...a,
        daysLeft: differenceInDays(new Date(a.trial_end!), now),
      }))
      .filter(a => a.daysLeft >= 0 && a.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [agencies]);

  // Past due agencies
  const pastDueAgencies = agencies.filter(a => a.computed_status === 'past_due');

  // Top agencies by usage
  const topAgencies = useMemo(() => {
    return agencyUsage
      .slice(0, 5)
      .filter(a => a.task_count > 0 || a.post_count > 0);
  }, [agencyUsage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-2xl font-bold">{conversionMetrics.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Trials → Pagantes</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Churn Rate</p>
                <p className="text-2xl font-bold">{conversionMetrics.churnRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Cancelamentos</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(conversionMetrics.avgTicket)}</p>
                <p className="text-xs text-muted-foreground">Por cliente ativo</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">LTV Estimado</p>
                <p className="text-2xl font-bold">{formatCurrency(conversionMetrics.estimatedLTV)}</p>
                <p className="text-xs text-muted-foreground">12 meses</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agency Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Crescimento de Agências
            </CardTitle>
            <CardDescription>Novas agências por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {growthChartData.length > 0 ? (
              <ChartContainer
                config={{
                  novas: { label: 'Novas', color: 'hsl(var(--primary))' },
                  convertidas: { label: 'Convertidas', color: 'hsl(142, 76%, 36%)' },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthChartData}>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="novas"
                      stackId="1"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="convertidas"
                      stackId="2"
                      stroke="hsl(142, 76%, 36%)"
                      fill="hsl(142, 76%, 36%)"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Distribuição de Status
            </CardTitle>
            <CardDescription>Agências por status de assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ChartContainer
                  config={{
                    value: { label: 'Quantidade' },
                  }}
                  className="h-[200px] w-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
                <div className="space-y-2">
                  {statusChartData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                      <Badge variant="secondary" className="ml-auto">{item.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart and Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Receita Mensal
            </CardTitle>
            <CardDescription>Pagamentos recebidos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {revenueChartData.length > 0 ? (
              <ChartContainer
                config={{
                  receita: { label: 'Receita', color: 'hsl(var(--primary))' },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueChartData}>
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis 
                      fontSize={12} 
                      tickFormatter={(value) => `R$ ${value}`}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar 
                      dataKey="receita" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Sem pagamentos registrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunities & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Oportunidades e Alertas
            </CardTitle>
            <CardDescription>Ações recomendadas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunities.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Trials expirando em breve
                </p>
                <div className="space-y-2">
                  {opportunities.slice(0, 3).map((agency) => (
                    <div 
                      key={agency.agency_id} 
                      className="flex items-center justify-between p-2 bg-blue-500/5 rounded-lg border border-blue-500/20"
                    >
                      <span className="text-sm">{agency.agency_name}</span>
                      <Badge variant={agency.daysLeft <= 2 ? 'destructive' : 'secondary'}>
                        {agency.daysLeft === 0 ? 'Hoje' : `${agency.daysLeft} dias`}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastDueAgencies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Pagamentos pendentes
                </p>
                <div className="space-y-2">
                  {pastDueAgencies.slice(0, 3).map((agency) => (
                    <div 
                      key={agency.agency_id} 
                      className="flex items-center justify-between p-2 bg-amber-500/5 rounded-lg border border-amber-500/20"
                    >
                      <span className="text-sm">{agency.agency_name}</span>
                      <Badge variant="outline" className="text-amber-600">Pendente</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {opportunities.length === 0 && pastDueAgencies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mb-2" />
                <p className="text-sm">Tudo em ordem! Sem alertas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Agencies by Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Top Agências por Uso
          </CardTitle>
          <CardDescription>Agências mais ativas na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {topAgencies.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">#</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Agência</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plano</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <FileText className="h-4 w-4" />
                        Tasks
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Activity className="h-4 w-4" />
                        Posts
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4" />
                        Usuários
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topAgencies.map((agency, index) => (
                    <tr key={agency.agency_id} className="border-b last:border-0">
                      <td className="py-3 px-2">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          {index + 1}º
                        </Badge>
                      </td>
                      <td className="py-3 px-2 font-medium">{agency.agency_name}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{agency.plan_name}</Badge>
                      </td>
                      <td className="py-3 px-2 text-center font-mono">{agency.task_count}</td>
                      <td className="py-3 px-2 text-center font-mono">{agency.post_count}</td>
                      <td className="py-3 px-2 text-center font-mono">{agency.user_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Sem dados de uso
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
