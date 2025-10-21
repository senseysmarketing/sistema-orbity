import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, Users, Calendar, CheckCircle, 
  AlertCircle, DollarSign, Target, MessageSquare, Monitor 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: number;
  variant?: "default" | "success" | "warning" | "danger";
}

export function MetricCard({ title, value, subtitle, icon, trend, progress, variant = "default" }: MetricCardProps) {
  const variantColors = {
    default: "text-primary",
    success: "text-green-600",
    warning: "text-orange-600",
    danger: "text-red-600",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantColors[variant]}`}>{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-1 text-xs">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span className={trend.isPositive ? "text-green-600" : "text-red-600"}>
              {trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">vs mês anterior</span>
          </div>
        )}
        {progress !== undefined && (
          <Progress value={progress} className="h-2 mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

interface DashboardMetricsProps {
  metrics: {
    totalClients: number;
    activeClients: number;
    totalLeads: number;
    convertedLeads: number;
    totalMeetings: number;
    upcomingMeetings: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    totalSocialPosts: number;
    publishedPosts: number;
    monthlyRevenue: number;
    adSpend?: number;
  };
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const taskCompletionRate = metrics.totalTasks > 0 
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) 
    : 0;

  const leadConversionRate = metrics.totalLeads > 0
    ? Math.round((metrics.convertedLeads / metrics.totalLeads) * 100)
    : 0;

  const postPublishRate = metrics.totalSocialPosts > 0
    ? Math.round((metrics.publishedPosts / metrics.totalSocialPosts) * 100)
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Clientes Ativos"
        value={metrics.activeClients}
        subtitle={`${metrics.totalClients} total`}
        icon={<Users className="h-4 w-4" />}
        variant="success"
      />

      <MetricCard
        title="Leads em Funil"
        value={metrics.totalLeads}
        subtitle={`${leadConversionRate}% de conversão`}
        icon={<Target className="h-4 w-4" />}
        progress={leadConversionRate}
        variant="default"
      />

      <MetricCard
        title="Reuniões Agendadas"
        value={metrics.upcomingMeetings}
        subtitle={`${metrics.totalMeetings} total no mês`}
        icon={<Calendar className="h-4 w-4" />}
        variant="default"
      />

      <MetricCard
        title="Taxa de Conclusão"
        value={`${taskCompletionRate}%`}
        subtitle={`${metrics.overdueTasks} tarefas atrasadas`}
        icon={<CheckCircle className="h-4 w-4" />}
        progress={taskCompletionRate}
        variant={metrics.overdueTasks > 0 ? "warning" : "success"}
      />

      <MetricCard
        title="Posts Publicados"
        value={metrics.publishedPosts}
        subtitle={`${postPublishRate}% do planejado`}
        icon={<MessageSquare className="h-4 w-4" />}
        progress={postPublishRate}
        variant="default"
      />

      <MetricCard
        title="Receita Mensal"
        value={new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(metrics.monthlyRevenue)}
        subtitle="Contratos ativos"
        icon={<DollarSign className="h-4 w-4" />}
        variant="success"
      />

      {metrics.adSpend !== undefined && (
        <MetricCard
          title="Investimento em Ads"
          value={new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(metrics.adSpend)}
          subtitle="Gasto mensal em tráfego"
          icon={<Monitor className="h-4 w-4" />}
          variant="default"
        />
      )}

      <MetricCard
        title="Alertas"
        value={metrics.overdueTasks}
        subtitle="Itens que precisam de atenção"
        icon={<AlertCircle className="h-4 w-4" />}
        variant={metrics.overdueTasks > 0 ? "danger" : "success"}
      />
    </div>
  );
}