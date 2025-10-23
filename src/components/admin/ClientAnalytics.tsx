import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Award, Calendar } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface ClientAnalyticsProps {
  payments: Payment[];
  monthlyValue: number;
  startDate: string | null;
}

export function ClientAnalytics({ payments, monthlyValue, startDate }: ClientAnalyticsProps) {
  // Calcula métricas
  const paidPayments = payments.filter(p => p.status === 'paid');
  const latePayments = paidPayments.filter(p => {
    if (!p.paid_date) return false;
    return new Date(p.paid_date) > new Date(p.due_date);
  });

  const punctualityRate = paidPayments.length > 0 
    ? ((paidPayments.length - latePayments.length) / paidPayments.length) * 100 
    : 0;

  const averageTicket = paidPayments.length > 0
    ? paidPayments.reduce((sum, p) => sum + p.amount, 0) / paidPayments.length
    : monthlyValue;

  const totalReceived = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  // Calcula LTV (baseado no tempo como cliente)
  const monthsAsClient = startDate 
    ? Math.max(1, Math.floor((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 1;
  
  const ltv = totalReceived;

  // Dados para o gráfico
  const chartData = payments
    .filter(p => p.status === 'paid')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(-12) // Últimos 12 meses
    .map(p => ({
      month: new Date(p.due_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value: p.amount,
    }));

  return (
    <div className="space-y-4">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Taxa de Pontualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {punctualityRate.toFixed(0)}%
              </span>
              <Badge 
                variant="outline"
                className={
                  punctualityRate >= 90
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : punctualityRate >= 70
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }
              >
                {punctualityRate >= 90 ? 'Excelente' : punctualityRate >= 70 ? 'Bom' : 'Atenção'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {paidPayments.length - latePayments.length} de {paidPayments.length} pagamentos em dia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                R$ {averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Baseado em {paidPayments.length} pagamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-600" />
              LTV (Lifetime Value)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-purple-600">
                R$ {ltv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Valor total recebido até hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Tempo como Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {monthsAsClient}
              </span>
              <span className="text-lg text-muted-foreground">
                {monthsAsClient === 1 ? 'mês' : 'meses'}
              </span>
            </div>
            {startDate && (
              <p className="text-xs text-muted-foreground mt-2">
                Desde {new Date(startDate).toLocaleDateString('pt-BR')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Pagamentos */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Status de Risco */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status de Risco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {latePayments.length >= 2 && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                ⚠️ Alto Risco: Múltiplos atrasos
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Cliente apresentou {latePayments.length} pagamentos atrasados. Considere ações de cobrança ou renegociação.
              </p>
            </div>
          )}

          {punctualityRate >= 90 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                ✅ Baixo Risco: Excelente histórico
              </p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-1">
                Cliente com excelente taxa de pontualidade. Considere oferecer benefícios ou upgrades.
              </p>
            </div>
          )}

          {punctualityRate < 90 && latePayments.length < 2 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                ℹ️ Risco Moderado: Monitorar
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                Cliente com pontualidade aceitável. Continue monitorando o comportamento de pagamento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
