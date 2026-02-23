import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, TrendingDown, Users, Calendar, CheckCircle, 
  AlertCircle, DollarSign, Target, Monitor,
  Eye, EyeOff
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
  isSensitive?: boolean;
  showValue?: boolean;
  onToggleVisibility?: () => void;
  canToggle?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  progress, 
  variant = "default",
  isSensitive = false,
  showValue = true,
  onToggleVisibility,
  canToggle = false
}: MetricCardProps) {
  const variantColors = {
    default: "text-primary",
    success: "text-green-600",
    warning: "text-orange-600",
    danger: "text-red-600",
  };

  const displayValue = isSensitive && !showValue ? "••••••" : value;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {canToggle && isSensitive && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleVisibility}
              title={showValue ? "Ocultar valor" : "Mostrar valor"}
            >
              {showValue ? (
                <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              )}
            </Button>
          )}
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantColors[variant]}`}>{displayValue}</div>
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
    monthlyRevenue: number;
    adSpend?: number;
  };
  showSensitiveData?: boolean;
  onToggleSensitiveData?: () => void;
  isAdmin?: boolean;
}

export function DashboardMetrics({ 
  metrics, 
  showSensitiveData = true, 
  onToggleSensitiveData,
  isAdmin = false
}: DashboardMetricsProps) {
  const taskCompletionRate = metrics.totalTasks > 0 
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100) 
    : 0;

  const leadConversionRate = metrics.totalLeads > 0
    ? Math.round((metrics.convertedLeads / metrics.totalLeads) * 100)
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
        title="Receita Mensal"
        value={new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(metrics.monthlyRevenue)}
        subtitle="Contratos ativos"
        icon={<DollarSign className="h-4 w-4" />}
        variant="success"
        isSensitive={true}
        showValue={showSensitiveData}
        onToggleVisibility={onToggleSensitiveData}
        canToggle={isAdmin}
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
          isSensitive={true}
          showValue={showSensitiveData}
          onToggleVisibility={onToggleSensitiveData}
          canToggle={isAdmin}
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
