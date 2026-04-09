import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMaster } from '@/hooks/useMaster';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, 
   
  Users, 
  Target, 
  DollarSign, 
  AlertTriangle,
  Award,
  Activity,
  FileText,
  Percent,
  Ban
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
  active: 'hsl(142, 76%, 36%)',
  past_due: 'hsl(25, 95%, 53%)',
  canceled: 'hsl(0, 0%, 45%)',
  suspended: 'hsl(0, 84%, 40%)',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  past_due: 'Inadimplente',
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

  const conversionMetrics = useMemo(() => {
    const totalAgencies = agencies.length;
    const totalActive = statusCounts.active;
    
    const activationRate = totalAgencies > 0 
      ? (totalActive / totalAgencies) * 100 
      : 0;
    
    const churnRate = totalActive > 0 
      ? (statusCounts.canceled / (totalActive + statusCounts.canceled)) * 100 
      : 0;

    const delinquencyRate = totalAgencies > 0
      ? (statusCounts.past_due / totalAgencies) * 100
      : 0;
    
    const avgTicket = totalActive > 0 ? masterMetrics.mrr / totalActive : 0;
    const estimatedLTV = avgTicket * 12;

    return {
      activationRate,
      churnRate,
      delinquencyRate,
      avgTicket,
      estimatedLTV,
    };
  }, [statusCounts, masterMetrics, agencies]);

  const growthChartData = useMemo(() => {
    return [...monthlyMetrics]
      .reverse()
      .map(m => ({
        month: format(parseISO(m.month), 'MMM/yy', { locale: ptBR }),
        novas: m.new_agencies,
        ativas: m.converted_to_paid,
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
    const relevantStatuses = { 
      active: statusCounts.active, 
      past_due: statusCounts.past_due, 
      canceled: statusCounts.canceled, 
      suspended: statusCounts.suspended 
    };
    return Object.entries(relevantStatuses)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || 'hsl(0, 0%, 50%)',
      }));
  }, [statusCounts]);

  // Inadimplent agencies (past_due)
  const pastDueAgencies = useMemo(() => {
    return agencies
      .filter(a => a.computed_status === 'past_due')
      .map(a => {
        const daysOverdue = a.current_period_end 
          ? differenceInDays(new Date(), new Date(a.current_period_end))
          : 0;
        return { ...a, daysOverdue: Math.max(0, daysOverdue) };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [agencies]);

  // Suspended agencies
  const suspendedAgencies = agencies.filter(a => a.computed_status === 'suspended');

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
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Ativação</p>
                <p className="text-2xl font-bold">{conversionMetrics.activationRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Agências ativas / total</p>
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
                <p className="text-sm text-muted-foreground">Taxa de Inadimplência</p>
                <p className="text-2xl font-bold text-amber-600">{conversionMetrics.delinquencyRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{statusCounts.past_due} agência(s)</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
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
                <p className="text-xs text-muted-foreground">Por agência ativa</p>
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
                  ativas: { label: 'Ativas', color: 'hsl(142, 76%, 36%)' },
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
                      dataKey="ativas"
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
            <CardDescription>Agências por situação</CardDescription>
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

      {/* Revenue Chart and Inadimplência */}
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

        {/* Inadimplência & Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Inadimplência e Alertas
            </CardTitle>
            <CardDescription>Agências com pagamentos pendentes ou suspensas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pastDueAgencies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Pagamentos em atraso ({pastDueAgencies.length})
                </p>
                <div className="space-y-2">
                  {pastDueAgencies.map((agency) => (
                    <div 
                      key={agency.agency_id} 
                      className="flex items-center justify-between p-3 bg-amber-500/5 rounded-lg border border-amber-500/20"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{agency.agency_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agency.monthly_value ? formatCurrency(agency.monthly_value) + '/mês' : 'Valor não definido'}
                        </span>
                      </div>
                      <Badge variant="destructive">
                        {agency.daysOverdue > 0 ? `${agency.daysOverdue} dias em atraso` : 'Vencido'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suspendedAgencies.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  Agências suspensas ({suspendedAgencies.length})
                </p>
                <div className="space-y-2">
                  {suspendedAgencies.map((agency) => (
                    <div 
                      key={agency.agency_id} 
                      className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/20"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{agency.agency_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {agency.monthly_value ? formatCurrency(agency.monthly_value) + '/mês' : 'Valor não definido'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-600">Suspensa</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastDueAgencies.length === 0 && suspendedAgencies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mb-2" />
                <p className="text-sm">Tudo em ordem! Sem inadimplências ou alertas.</p>
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
                    <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center justify-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Valor Mensal
                      </div>
                    </th>
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
                  {topAgencies.map((agency, index) => {
                    const agencyData = agencies.find(a => a.agency_id === agency.agency_id);
                    return (
                      <tr key={agency.agency_id} className="border-b last:border-0">
                        <td className="py-3 px-2">
                          <Badge variant={index === 0 ? 'default' : 'secondary'}>
                            {index + 1}º
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-medium">{agency.agency_name}</td>
                        <td className="py-3 px-2 text-center text-sm">
                          {agencyData?.monthly_value ? formatCurrency(agencyData.monthly_value) : '—'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{agency.task_count}</td>
                        <td className="py-3 px-2 text-center font-mono">{agency.post_count}</td>
                        <td className="py-3 px-2 text-center font-mono">{agency.user_count}</td>
                      </tr>
                    );
                  })}
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
