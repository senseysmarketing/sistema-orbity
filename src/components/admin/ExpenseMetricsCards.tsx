import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown, Target, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Expense {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date: string | null;
  due_date: string;
}

interface Salary {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date: string | null;
  due_date: string;
}

interface ExpenseMetricsCardsProps {
  expenses: Expense[];
  previousMonthExpenses: Expense[];
  salaries?: Salary[];
  previousMonthSalaries?: Salary[];
}

export function ExpenseMetricsCards({ 
  expenses, 
  previousMonthExpenses, 
  salaries = [], 
  previousMonthSalaries = [] 
}: ExpenseMetricsCardsProps) {
  // Combina despesas e salários para cálculos totais
  const allCosts = [...expenses, ...salaries];
  const allPreviousCosts = [...previousMonthExpenses, ...previousMonthSalaries];

  // Totais de despesas
  const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalSalariesAmount = salaries.reduce((sum, sal) => sum + sal.amount, 0);
  const totalCosts = totalExpensesAmount + totalSalariesAmount;

  // Pagos
  const paidExpenses = expenses.filter(exp => exp.status === 'paid');
  const paidSalaries = salaries.filter(sal => sal.status === 'paid');
  const totalPaid = paidExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                    paidSalaries.reduce((sum, sal) => sum + sal.amount, 0);

  // Pendentes
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending');
  const pendingSalaries = salaries.filter(sal => sal.status === 'pending');
  const totalPending = pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                       pendingSalaries.reduce((sum, sal) => sum + sal.amount, 0);

  // Atrasados
  const overdueExpenses = expenses.filter(exp => exp.status === 'overdue');
  const overdueSalaries = salaries.filter(sal => sal.status === 'overdue');
  const totalOverdue = overdueExpenses.reduce((sum, exp) => sum + exp.amount, 0) + 
                       overdueSalaries.reduce((sum, sal) => sum + sal.amount, 0);

  // Comparativo com mês anterior
  const previousTotal = allPreviousCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const variation = previousTotal > 0 ? ((totalCosts - previousTotal) / previousTotal) * 100 : 0;

  // Taxa de adimplência (despesas + salários pagos no prazo)
  const paidOnTimeExpenses = paidExpenses.filter(exp => {
    if (!exp.paid_date) return false;
    const paidDate = new Date(exp.paid_date);
    const dueDate = new Date(exp.due_date);
    return paidDate <= dueDate;
  }).length;
  
  const paidOnTimeSalaries = paidSalaries.filter(sal => {
    if (!sal.paid_date) return false;
    const paidDate = new Date(sal.paid_date);
    const dueDate = new Date(sal.due_date);
    return paidDate <= dueDate;
  }).length;
  
  const totalItems = allCosts.length;
  const paidOnTimeTotal = paidOnTimeExpenses + paidOnTimeSalaries;
  const complianceRate = totalItems > 0 ? (paidOnTimeTotal / totalItems) * 100 : 0;

  const paidCount = paidExpenses.length + paidSalaries.length;
  const pendingCount = pendingExpenses.length + pendingSalaries.length;
  const overdueCount = overdueExpenses.length + overdueSalaries.length;

  const metrics = [
    {
      title: "Total do Mês",
      value: totalCosts,
      icon: DollarSign,
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-900",
      trend: variation,
      subtitle: salaries.length > 0 ? `Despesas: R$ ${totalExpensesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Salários: R$ ${totalSalariesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined,
    },
    {
      title: "Custos Pagos",
      value: totalPaid,
      count: paidCount,
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-950/20",
      iconColor: "text-green-600 dark:text-green-400",
      borderColor: "border-green-200 dark:border-green-900",
    },
    {
      title: "Custos Pendentes",
      value: totalPending,
      count: pendingCount,
      icon: Clock,
      bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      borderColor: "border-yellow-200 dark:border-yellow-900",
    },
    {
      title: "Custos Atrasados",
      value: totalOverdue,
      count: overdueCount,
      icon: AlertTriangle,
      bgColor: "bg-red-50 dark:bg-red-950/20",
      iconColor: "text-red-600 dark:text-red-400",
      borderColor: "border-red-200 dark:border-red-900",
      alert: overdueCount > 0,
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
                    {metric.count} {metric.count === 1 ? 'item' : 'itens'}
                  </p>
                )}

                {metric.subtitle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {metric.subtitle}
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
