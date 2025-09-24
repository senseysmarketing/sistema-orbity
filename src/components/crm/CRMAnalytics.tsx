import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Clock, DollarSign, Users, Calendar, Award, Zap } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  priority: string;
  value: number;
  source: string;
  last_contact: string | null;
  next_contact: string | null;
  created_at: string;
  updated_at: string;
}

interface CRMAnalyticsProps {
  leads: Lead[];
}

export function CRMAnalytics({ leads }: CRMAnalyticsProps) {
  const analytics = useMemo(() => {
    const total = leads.length;
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const thisWeek = new Date(today.getTime() - (today.getDay() * 24 * 60 * 60 * 1000));

    // Basic metrics
    const newLeads = leads.filter(l => l.status === 'new').length;
    const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
    const wonLeads = leads.filter(l => l.status === 'won').length;
    const lostLeads = leads.filter(l => l.status === 'lost').length;

    // Conversion rates
    const qualificationRate = total > 0 ? (qualifiedLeads / total) * 100 : 0;
    const conversionRate = total > 0 ? (wonLeads / total) * 100 : 0;
    const lossRate = total > 0 ? (lostLeads / total) * 100 : 0;

    // Time-based analysis
    const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonth).length;
    const leadsLastMonth = leads.filter(l => {
      const createdAt = new Date(l.created_at);
      return createdAt >= lastMonth && createdAt < thisMonth;
    }).length;
    const leadsThisWeek = leads.filter(l => new Date(l.created_at) >= thisWeek).length;

    const monthlyGrowth = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : 0;

    // Value analysis
    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
    const wonValue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.value || 0), 0);
    const averageLeadValue = total > 0 ? totalValue / total : 0;
    const averageWonValue = wonLeads > 0 ? wonValue / wonLeads : 0;

    // Response time analysis
    const followUpNeeded = leads.filter(l => {
      if (!l.next_contact || ['won', 'lost'].includes(l.status)) return false;
      return new Date(l.next_contact) <= today;
    }).length;

    const overdueFollowUp = leads.filter(l => {
      if (!l.next_contact || ['won', 'lost'].includes(l.status)) return false;
      return new Date(l.next_contact) < today;
    }).length;

    // Source performance
    const sourcePerformance: { [key: string]: { count: number; won: number; rate: number } } = {};
    leads.forEach(lead => {
      if (!sourcePerformance[lead.source]) {
        sourcePerformance[lead.source] = { count: 0, won: 0, rate: 0 };
      }
      sourcePerformance[lead.source].count++;
      if (lead.status === 'won') {
        sourcePerformance[lead.source].won++;
      }
    });

    Object.keys(sourcePerformance).forEach(source => {
      const data = sourcePerformance[source];
      data.rate = data.count > 0 ? (data.won / data.count) * 100 : 0;
    });

    // Top performing sources
    const topSources = Object.entries(sourcePerformance)
      .sort(([, a], [, b]) => b.rate - a.rate)
      .slice(0, 3);

    // Activity analysis
    const highPriorityLeads = leads.filter(l => l.priority === 'high').length;
    const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;

    // Lead velocity (average time in pipeline)
    const closedLeads = leads.filter(l => ['won', 'lost'].includes(l.status));
    const averageTimeInPipeline = closedLeads.length > 0 
      ? closedLeads.reduce((sum, lead) => {
          const created = new Date(lead.created_at);
          const updated = new Date(lead.updated_at);
          return sum + (updated.getTime() - created.getTime());
        }, 0) / closedLeads.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    return {
      total,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      qualificationRate,
      conversionRate,
      lossRate,
      leadsThisMonth,
      leadsThisWeek,
      monthlyGrowth,
      totalValue,
      wonValue,
      averageLeadValue,
      averageWonValue,
      followUpNeeded,
      overdueFollowUp,
      sourcePerformance,
      topSources,
      highPriorityLeads,
      activeLeads,
      averageTimeInPipeline
    };
  }, [leads]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Qualificação</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.qualificationRate)}</div>
            <Progress value={analytics.qualificationRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.qualifiedLeads} de {analytics.total} leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.conversionRate)}</div>
            <Progress value={analytics.conversionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.wonLeads} leads fechados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento Mensal</CardTitle>
            {analytics.monthlyGrowth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.monthlyGrowth >= 0 ? '+' : ''}{formatPercentage(analytics.monthlyGrowth)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.leadsThisMonth} este mês vs {analytics.leadsLastMonth} anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio no Pipeline</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.averageTimeInPipeline)} dias
            </div>
            <p className="text-xs text-muted-foreground">
              Baseado em leads fechados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Value Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Confirmada</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.wonValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por venda: {formatCurrency(analytics.averageWonValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por lead: {formatCurrency(analytics.averageLeadValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Urgentes</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {analytics.followUpNeeded}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.overdueFollowUp} em atraso
            </p>
            {analytics.overdueFollowUp > 0 && (
              <Badge variant="destructive" className="mt-1 text-xs">
                Ação necessária
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Melhores Fontes de Lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topSources.map(([source, data], index) => (
              <div key={source} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium capitalize">{source}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.count} leads • {data.won} conversões
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={index === 0 ? "default" : "secondary"}>
                    {formatPercentage(data.rate)}
                  </Badge>
                </div>
              </div>
            ))}
            {analytics.topSources.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Dados insuficientes para análise
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Resumo da Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Leads Ativos</span>
              <Badge variant="secondary">{analytics.activeLeads}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Alta Prioridade</span>
              <Badge variant="destructive">{analytics.highPriorityLeads}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Novos esta Semana</span>
              <Badge variant="outline">{analytics.leadsThisWeek}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Taxa de Perda</span>
              <Badge variant="outline" className="text-red-600">
                {formatPercentage(analytics.lossRate)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}