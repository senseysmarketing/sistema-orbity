import { CheckCircle, AlertTriangle, TrendingUp, Calendar, DollarSign, Clock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payment {
  id: string;
  due_date: string;
  paid_date: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

interface ExpenseAnalyticsProps {
  payments: Payment[];
  expenseType?: 'avulsa' | 'recorrente' | 'parcelada';
}

export function ExpenseAnalytics({ payments, expenseType }: ExpenseAnalyticsProps) {
  // Análise dos últimos 6 meses
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Agrupar pagamentos por mês
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthPayments = payments.filter(p => {
      const paymentDate = new Date(p.due_date);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    });

    const paid = monthPayments.filter(p => p.status === 'paid');
    const paidOnTime = paid.filter(p => {
      if (!p.paid_date) return false;
      return new Date(p.paid_date) <= new Date(p.due_date);
    });

    return {
      month: format(month, "MMM/yy", { locale: ptBR }),
      total: monthPayments.reduce((sum, p) => sum + p.amount, 0),
      paid: paid.reduce((sum, p) => sum + p.amount, 0),
      onTimeCount: paidOnTime.length,
      lateCount: paid.length - paidOnTime.length,
      avgDaysLate: paid.length > 0
        ? paid.reduce((sum, p) => {
            if (!p.paid_date) return sum;
            const days = Math.ceil((new Date(p.paid_date).getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24));
            return sum + Math.max(0, days);
          }, 0) / paid.length
        : 0,
    };
  });

  // Estatísticas gerais
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.status === 'paid');
  const paidOnTime = paidPayments.filter(p => {
    if (!p.paid_date) return false;
    return new Date(p.paid_date) <= new Date(p.due_date);
  });

  const onTimeRate = paidPayments.length > 0 ? (paidOnTime.length / paidPayments.length) * 100 : 0;
  const avgAmount = payments.length > 0 ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0;
  
  const avgDaysLate = paidPayments.length > 0
    ? paidPayments.reduce((sum, p) => {
        if (!p.paid_date) return sum;
        const days = Math.ceil((new Date(p.paid_date).getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0) / paidPayments.length
    : 0;

  // Variação mês a mês
  const lastMonthData = monthlyData[monthlyData.length - 1];
  const prevMonthData = monthlyData[monthlyData.length - 2];
  const monthOverMonthChange = prevMonthData && prevMonthData.total > 0
    ? ((lastMonthData.total - prevMonthData.total) / prevMonthData.total) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Total de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              R$ {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPayments} pagamentos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              Taxa de Pontualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-green-600">
                {onTimeRate.toFixed(0)}%
              </p>
              <Badge 
                variant="outline"
                className={
                  onTimeRate >= 90
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : onTimeRate >= 70
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }
              >
                {onTimeRate >= 90 ? 'Excelente' : onTimeRate >= 70 ? 'Bom' : 'Atenção'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidOnTime.length} de {paidPayments.length} pagamentos em dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Atrasos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {paidPayments.length - paidOnTime.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {avgDaysLate > 0 ? `Média de ${avgDaysLate.toFixed(0)} dias de atraso` : 'Nenhum atraso'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Valor Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              R$ {avgAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Por pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução Mensal */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <h4 className="font-semibold mb-4">Evolução dos Últimos 6 Meses</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total" fill="hsl(var(--primary))" name="Total (R$)" />
            <Bar dataKey="paid" fill="hsl(var(--chart-1))" name="Pago (R$)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Performance de Pagamento */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <h4 className="font-semibold mb-4">Performance de Pagamento</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="onTimeCount" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              name="Pagos no Prazo"
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="lateCount" 
              stroke="hsl(var(--destructive))" 
              strokeWidth={2}
              name="Pagos com Atraso"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="avgDaysLate" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Média Dias Atraso"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Análise Comparativa */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <h4 className="font-semibold">Tendência Recente</h4>
          <div className="flex items-center gap-3">
            {monthOverMonthChange > 0 ? (
              <TrendingUp className="h-8 w-8 text-red-500" />
            ) : (
              <TrendingUp className="h-8 w-8 text-green-500 rotate-180" />
            )}
            <div>
              <p className="text-2xl font-bold">
                {Math.abs(monthOverMonthChange).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">
                {monthOverMonthChange > 0 ? 'Aumento' : 'Redução'} vs mês anterior
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <h4 className="font-semibold">Taxa de Pontualidade</h4>
          <div className="flex items-center gap-3">
            {onTimeRate >= 80 ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            )}
            <div>
              <p className="text-2xl font-bold">{onTimeRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">
                {onTimeRate >= 80 ? 'Excelente desempenho' : 'Precisa melhorar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Insights e Recomendações */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">Insights e Recomendações</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              {onTimeRate >= 80 && (
                <li>Ótima taxa de pontualidade! Continue mantendo o controle rigoroso dos prazos.</li>
              )}
              {onTimeRate < 80 && (
                <li>Considere configurar lembretes automáticos para melhorar a pontualidade nos pagamentos.</li>
              )}
              {avgDaysLate > 5 && (
                <li>A média de atraso está acima do ideal. Revise o processo de aprovação de pagamentos.</li>
              )}
              {monthOverMonthChange > 20 && (
                <li>Houve um aumento significativo no último mês. Verifique se está dentro do orçamento planejado.</li>
              )}
              {expenseType === 'recorrente' && (
                <li>Como despesa recorrente, considere negociar descontos para pagamento anual.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
