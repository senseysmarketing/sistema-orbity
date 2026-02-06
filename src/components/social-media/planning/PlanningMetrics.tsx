import { Card, CardContent } from "@/components/ui/card";
import { Users, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { ClientWeekPlan } from "./types";

interface PlanningMetricsProps {
  clientPlans: ClientWeekPlan[];
  totalClients: number;
}

export function PlanningMetrics({ clientPlans, totalClients }: PlanningMetricsProps) {
  const clientsWithPosts = clientPlans.filter(c => c.weekTotal > 0).length;
  const totalPosts = clientPlans.reduce((sum, c) => sum + c.weekTotal, 0);
  const totalReady = clientPlans.reduce((sum, c) => sum + c.readyCount, 0);
  const readinessRate = totalPosts > 0 ? Math.round((totalReady / totalPosts) * 100) : 0;
  const overdueCount = clientPlans.filter(c => c.hasOverdue).length;
  const clientsWithoutPosts = totalClients - clientsWithPosts;

  const metrics = [
    {
      label: "Clientes Cobertos",
      value: `${clientsWithPosts}/${totalClients}`,
      icon: Users,
      color: clientsWithPosts === totalClients ? "text-green-600" : "text-amber-600",
      bgColor: clientsWithPosts === totalClients ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Taxa de Prontidão",
      value: `${readinessRate}%`,
      icon: CheckCircle2,
      color: readinessRate >= 80 ? "text-green-600" : readinessRate >= 50 ? "text-amber-600" : "text-red-600",
      bgColor: readinessRate >= 80 ? "bg-green-100 dark:bg-green-900/30" : readinessRate >= 50 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: "Alertas",
      value: overdueCount + clientsWithoutPosts,
      icon: AlertTriangle,
      color: (overdueCount + clientsWithoutPosts) > 0 ? "text-red-600" : "text-green-600",
      bgColor: (overdueCount + clientsWithoutPosts) > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30",
      subtitle: overdueCount > 0 ? `${overdueCount} atrasados` : clientsWithoutPosts > 0 ? `${clientsWithoutPosts} sem posts` : "Tudo em dia",
    },
    {
      label: "Posts da Semana",
      value: totalPosts,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      subtitle: `${totalReady} prontos`,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{metric.label}</p>
                <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
                {metric.subtitle && (
                  <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
