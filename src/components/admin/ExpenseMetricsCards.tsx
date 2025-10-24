import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_date: string | null;
  due_date: string;
}

interface ExpenseMetricsCardsProps {
  expenses: Expense[];
  previousMonthExpenses: Expense[];
}

export function ExpenseMetricsCards({ expenses, previousMonthExpenses }: ExpenseMetricsCardsProps) {
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const paidExpenses = expenses.filter(exp => exp.status === 'paid');
  const totalPaid = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending');
  const totalPending = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const overdueExpenses = expenses.filter(exp => exp.status === 'overdue');
  const totalOverdue = overdueExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Comparativo com mês anterior
  const previousTotal = previousMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const variation = previousTotal > 0 ? ((totalExpenses - previousTotal) / previousTotal) * 100 : 0;

  // Taxa de adimplência (despesas pagas no prazo)
  const paidOnTime = paidExpenses.filter(exp => {
    if (!exp.paid_date) return false;
    const paidDate = new Date(exp.paid_date);
    const dueDate = new Date(exp.due_date);
    return paidDate <= dueDate;
  }).length;
  
  const complianceRate = expenses.length > 0 ? (paidOnTime / expenses.length) * 100 : 0;

  const metrics = [
    {
      title: "Total do Mês",
      value: totalExpenses,
      icon: DollarSign,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-900",
      trend: variation,
    },
    {
      title: "Despesas Pagas",
      value: totalPaid,
      count: paidExpenses.length,
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-950/20",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-900",
    },
    {
      title: "Despesas Pendentes",
      value: totalPending,
      count: pendingExpenses.length,
      icon: Clock,
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      borderColor: "border-yellow-200 dark:border-yellow-900",
    },
    {
      title: "Despesas Atrasadas",
      value: totalOverdue,
      count: overdueExpenses.length,
      icon: AlertTriangle,
      bgColor: "bg-red-50 dark:bg-red-950/20",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-200 dark:border-red-900",
      alert: overdueExpenses.length > 0,
    },
    {
      title: "Taxa de Adimplência",
      value: complianceRate,
      isPercentage: true,
      icon: Target,
      bgColor: complianceRate >= 80 ? "bg-green-50 dark:bg-green-950/20" : "bg-orange-50 dark:bg-orange-950/20",
      iconColor: complianceRate >= 80 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400",
      borderColor: complianceRate >= 80 ? "border-green-200 dark:border-green-900" : "border-orange-200 dark:border-orange-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={index} 
            className={`${metric.bgColor} border ${metric.borderColor} ${metric.alert ? 'ring-2 ring-red-400 dark:ring-red-600' : ''}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg bg-background/50`}>
                  <Icon className={`h-5 w-5 ${metric.iconColor}`} />
                </div>
                {metric.alert && (
                  <Badge variant="destructive" className="animate-pulse">
                    Atenção!
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {metric.isPercentage 
                      ? `${metric.value.toFixed(1)}%`
                      : `R$ ${metric.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  </p>
                </div>
                
                {metric.count !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {metric.count} {metric.count === 1 ? 'despesa' : 'despesas'}
                  </p>
                )}

                {metric.trend !== undefined && (
                  <div className="flex items-center gap-1 mt-2">
                    {metric.trend > 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-red-500" />
                        <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                          +{metric.trend.toFixed(1)}% vs mês anterior
                        </span>
                      </>
                    ) : metric.trend < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {metric.trend.toFixed(1)}% vs mês anterior
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Igual ao mês anterior
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
