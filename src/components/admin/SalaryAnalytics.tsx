import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface SalaryAnalyticsProps {
  salary: Salary;
  relatedSalaries: Salary[];
}

export function SalaryAnalytics({ salary, relatedSalaries }: SalaryAnalyticsProps) {
  // Análise de pontualidade ao longo do tempo
  const punctualityData = useMemo(() => {
    return relatedSalaries
      .filter(s => s.paid_date)
      .sort((a, b) => new Date(a.paid_date!).getTime() - new Date(b.paid_date!).getTime())
      .map(s => {
        const dueDate = new Date(s.due_date);
        const paidDate = new Date(s.paid_date!);
        const daysLate = differenceInDays(paidDate, dueDate);
        
        return {
          month: format(paidDate, 'MMM/yy', { locale: ptBR }),
          diasAtraso: Math.max(0, daysLate),
          status: daysLate <= 0 ? 'Em Dia' : 'Atrasado'
        };
      });
  }, [relatedSalaries]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const paidSalaries = relatedSalaries.filter(s => s.paid_date);
    const onTimeSalaries = paidSalaries.filter(s => {
      const dueDate = new Date(s.due_date);
      const paidDate = new Date(s.paid_date!);
      return paidDate <= dueDate;
    });
    
    const totalPaid = paidSalaries.reduce((acc, s) => acc + s.amount, 0);
    const averageAmount = paidSalaries.length > 0 ? totalPaid / paidSalaries.length : 0;
    const onTimeRate = paidSalaries.length > 0 ? (onTimeSalaries.length / paidSalaries.length) * 100 : 0;
    
    const avgDaysLate = paidSalaries.reduce((acc, s) => {
      const dueDate = new Date(s.due_date);
      const paidDate = new Date(s.paid_date!);
      const days = differenceInDays(paidDate, dueDate);
      return acc + Math.max(0, days);
    }, 0) / Math.max(1, paidSalaries.length);

    return {
      totalPayments: paidSalaries.length,
      onTimePayments: onTimeSalaries.length,
      latePayments: paidSalaries.length - onTimeSalaries.length,
      totalPaid,
      averageAmount,
      onTimeRate,
      avgDaysLate
    };
  }, [relatedSalaries]);

  // Dados de evolução mensal
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { paid: number; total: number; amount: number }>();
    
    relatedSalaries.forEach(s => {
      const month = format(parseISO(s.due_date), 'MMM/yy', { locale: ptBR });
      const current = monthMap.get(month) || { paid: 0, total: 0, amount: 0 };
      
      current.total += 1;
      if (s.status === 'paid') {
        current.paid += 1;
        current.amount += s.amount;
      }
      
      monthMap.set(month, current);
    });
    
    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      pagos: data.paid,
      total: data.total,
      valor: data.amount
    }));
  }, [relatedSalaries]);

  return (
    <div className="space-y-4 mt-4">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
              <p className="text-2xl font-bold">{stats.totalPayments}</p>
              <Badge variant="outline" className="text-xs">
                Registros analisados
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Taxa de Pontualidade</p>
              <p className={`text-2xl font-bold ${stats.onTimeRate >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {stats.onTimeRate.toFixed(1)}%
              </p>
              <div className="flex items-center gap-1">
                {stats.onTimeRate >= 80 ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-3 w-3 text-orange-600" />
                )}
                <span className="text-xs text-muted-foreground">
                  {stats.onTimePayments}/{stats.totalPayments} no prazo
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Média de Atraso</p>
              <p className={`text-2xl font-bold ${stats.avgDaysLate <= 3 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.avgDaysLate.toFixed(1)}
              </p>
              <Badge variant="outline" className="text-xs">
                dias
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-primary">
                R$ {(stats.totalPaid / 1000).toFixed(1)}k
              </p>
              <Badge variant="outline" className="text-xs">
                Histórico completo
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Pontualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise de Pontualidade por Período</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={punctualityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: 'Dias de Atraso', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-lg">
                        <p className="font-semibold">{payload[0].payload.month}</p>
                        <p className="text-sm">
                          Atraso: <span className="font-bold">{payload[0].value} dias</span>
                        </p>
                        <Badge className={payload[0].payload.status === 'Em Dia' ? 'bg-green-600' : 'bg-red-600'}>
                          {payload[0].payload.status}
                        </Badge>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="diasAtraso" 
                stroke="#ef4444" 
                fill="#fecaca" 
                name="Dias de Atraso"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução Mensal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="pagos" fill="#10b981" name="Pagos" />
              <Bar yAxisId="left" dataKey="total" fill="#94a3b8" name="Total" />
              <Line yAxisId="right" type="monotone" dataKey="valor" stroke="#3b82f6" name="Valor (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.onTimeRate >= 90 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 dark:text-green-100">Excelente Histórico</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Taxa de pontualidade acima de 90%. Continue mantendo essa regularidade!
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.onTimeRate < 70 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 dark:text-red-100">Atenção Necessária</p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Taxa de pontualidade abaixo de 70%. Recomendamos automatizar este pagamento.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stats.avgDaysLate > 5 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">Média de Atraso Alta</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Média de {stats.avgDaysLate.toFixed(1)} dias de atraso. Configure lembretes com antecedência.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Planejamento Financeiro</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Valor mensal fixo de R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. 
                  Reserve este valor antecipadamente para evitar atrasos.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
