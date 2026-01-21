import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Target, DollarSign, Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface Lead {
  id: string;
  status: string;
  temperature: string;
  value: number;
  created_at: string;
  next_contact: string | null;
}

interface CRMMetricsProps {
  leads: Lead[];
}

export function CRMMetrics({ leads }: CRMMetricsProps) {
  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => ['leads', 'em_contato', 'new'].includes(lead.status)).length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
  const wonLeads = leads.filter(lead => lead.status === 'won').length;
  const lostLeads = leads.filter(lead => lead.status === 'lost').length;
  
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const wonValue = leads
    .filter(lead => lead.status === 'won')
    .reduce((sum, lead) => sum + (lead.value || 0), 0);
  
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  
  // Leads with follow-up needed (next_contact is today or past)
  const today = new Date().toISOString().split('T')[0];
  const followUpNeeded = leads.filter(lead => 
    lead.next_contact && lead.next_contact <= today && 
    !['won', 'lost'].includes(lead.status)
  ).length;

  // Calculate this month vs last month
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= thisMonth).length;
  const leadsLastMonth = leads.filter(l => {
    const createdAt = new Date(l.created_at);
    return createdAt >= lastMonth && createdAt < thisMonth;
  }).length;

  const monthlyGrowth = leadsLastMonth > 0 ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 : 0;

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      trend: monthlyGrowth,
      trendLabel: `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(0)}% este mês`,
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
      progress: conversionRate,
      subtitle: `${wonLeads} de ${totalLeads} convertidos`,
    },
    {
      title: "Valor Total Pipeline",
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(totalValue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
      subtitle: `${new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
      }).format(wonValue)} confirmado`,
    },
    {
      title: "Follow-ups Pendentes",
      value: followUpNeeded,
      icon: Calendar,
      color: followUpNeeded > 0 ? "text-orange-600" : "text-green-600",
      bgColor: followUpNeeded > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "bg-green-50 dark:bg-green-950/30",
      subtitle: followUpNeeded > 0 ? "Requer atenção imediata" : "Tudo em dia",
      badge: followUpNeeded > 0 ? "Urgente" : null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            
            {metric.progress !== undefined && (
              <Progress value={metric.progress} className="mt-2" />
            )}
            
            {metric.trend !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {metric.trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <p className={`text-xs ${metric.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.trendLabel}
                </p>
              </div>
            )}
            
            {metric.subtitle && !metric.trend && (
              <p className="text-xs text-muted-foreground mt-1">
                {metric.subtitle}
              </p>
            )}
            
            {metric.badge && (
              <Badge variant="destructive" className="mt-2 text-xs">
                {metric.badge}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
