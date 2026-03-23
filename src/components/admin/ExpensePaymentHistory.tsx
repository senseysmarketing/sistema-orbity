import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Payment {
  id: string;
  due_date: string;
  paid_date: string | null;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

interface ExpensePaymentHistoryProps {
  payments: Payment[];
}

export function ExpensePaymentHistory({ payments }: ExpensePaymentHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Filtrar pagamentos
  const filteredPayments = payments.filter(payment => {
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    
    let matchesPeriod = true;
    if (periodFilter !== "all") {
      const paymentDate = new Date(payment.due_date);
      const now = new Date();
      
      if (periodFilter === "3months") {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        matchesPeriod = paymentDate >= threeMonthsAgo;
      } else if (periodFilter === "6months") {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        matchesPeriod = paymentDate >= sixMonthsAgo;
      } else if (periodFilter === "year") {
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        matchesPeriod = paymentDate >= oneYearAgo;
      }
    }
    
    return matchesStatus && matchesPeriod;
  });

  // Preparar dados para o gráfico
  const chartData = filteredPayments
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .map(payment => ({
      month: format(new Date(payment.due_date), "MMM/yy", { locale: ptBR }),
      valor: payment.amount,
      daysLate: payment.paid_date && payment.status === 'paid'
        ? Math.max(0, Math.ceil((new Date(payment.paid_date).getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    }));

  // Estatísticas
  const totalPaid = filteredPayments.filter(p => p.status === 'paid').length;
  const totalOverdue = filteredPayments.filter(p => p.status === 'overdue').length;
  const totalPending = filteredPayments.filter(p => p.status === 'pending').length;
  
  const paidPayments = filteredPayments.filter(p => p.status === 'paid' && p.paid_date);
  const avgDaysToPayment = paidPayments.length > 0
    ? paidPayments.reduce((sum, p) => {
        const daysLate = Math.ceil((new Date(p.paid_date!).getTime() - new Date(p.due_date).getTime()) / (1000 * 60 * 60 * 24));
        return sum + daysLate;
      }, 0) / paidPayments.length
    : 0;

  const onTimeRate = paidPayments.length > 0
    ? (paidPayments.filter(p => {
        const paidDate = new Date(p.paid_date!);
        const dueDate = new Date(p.due_date);
        return paidDate <= dueDate;
      }).length / paidPayments.length) * 100
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{totalPaid}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{totalPending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{totalOverdue}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Pontualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{onTimeRate.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o Período</SelectItem>
            <SelectItem value="3months">Últimos 3 meses</SelectItem>
            <SelectItem value="6months">Últimos 6 meses</SelectItem>
            <SelectItem value="year">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gráfico de Evolução */}
      {chartData.length > 0 && (
        <div className="p-4 bg-muted/30 rounded-lg border">
          <h4 className="font-semibold mb-4">Evolução de Valores e Atrasos</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="valor" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Valor (R$)"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="daysLate" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Dias de Atraso"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Análise de Performance */}
      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
        <h4 className="font-semibold">Análise de Performance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Média de Dias para Pagamento</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold">
                {avgDaysToPayment > 0 ? avgDaysToPayment.toFixed(1) : '0'} dias
              </p>
              {avgDaysToPayment > 0 ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa de Pontualidade</p>
            <div className="flex items-center gap-2">
              <p className="text-xl font-bold text-green-600">{onTimeRate.toFixed(1)}%</p>
              {onTimeRate >= 80 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Histórico */}
      <div className="space-y-2">
        <h4 className="font-semibold">Histórico Detalhado ({filteredPayments.length} registros)</h4>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Data Vencimento</th>
                <th className="text-left p-3 text-sm font-medium">Data Pagamento</th>
                <th className="text-left p-3 text-sm font-medium">Valor</th>
                <th className="text-left p-3 text-sm font-medium">Status</th>
                <th className="text-left p-3 text-sm font-medium">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => {
                const daysLate = payment.paid_date && payment.status === 'paid'
                  ? Math.ceil((new Date(payment.paid_date).getTime() - new Date(payment.due_date).getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                return (
                  <tr key={payment.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 text-sm">
                      {format(new Date(payment.due_date), "dd/MM/yyyy")}
                    </td>
                    <td className="p-3 text-sm">
                      {payment.paid_date 
                        ? format(new Date(payment.paid_date), "dd/MM/yyyy")
                        : '-'
                      }
                    </td>
                    <td className="p-3 text-sm font-medium">
                      R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(payment.status)}>
                        {getStatusLabel(payment.status)}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">
                      {daysLate > 0 ? (
                        <span className="text-red-600 font-medium">{daysLate} dias</span>
                      ) : daysLate < 0 ? (
                        <span className="text-green-600 font-medium">Adiantado</span>
                      ) : payment.status === 'paid' ? (
                        <span className="text-green-600 font-medium">No prazo</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum registro encontrado para os filtros selecionados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
