import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useMemo } from "react";

interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface SalaryPaymentHistoryProps {
  salaries: Salary[];
}

export function SalaryPaymentHistory({ salaries }: SalaryPaymentHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredSalaries = useMemo(() => {
    if (statusFilter === "all") return salaries;
    return salaries.filter(s => s.status === statusFilter);
  }, [salaries, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">💰 Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">⏰ Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">🚨 Atrasado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Dados para o gráfico de linha
  const chartData = useMemo(() => {
    return salaries
      .filter(s => s.paid_date)
      .sort((a, b) => new Date(a.paid_date!).getTime() - new Date(b.paid_date!).getTime())
      .map(s => ({
        date: format(parseISO(s.paid_date!), 'MMM/yy', { locale: ptBR }),
        valor: s.amount,
        daysLate: Math.max(0, Math.ceil((new Date(s.paid_date!).getTime() - new Date(s.due_date).getTime()) / (1000 * 60 * 60 * 24)))
      }));
  }, [salaries]);

  // Estatísticas
  const totalPaid = filteredSalaries.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.amount, 0);
  const totalPending = filteredSalaries.filter(s => s.status === 'pending').reduce((acc, s) => acc + s.amount, 0);
  const totalOverdue = filteredSalaries.filter(s => s.status === 'overdue').reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Pago</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredSalaries.filter(s => s.status === 'paid').length} pagamentos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-2xl font-bold text-yellow-600">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredSalaries.filter(s => s.status === 'pending').length} pendentes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Atrasado</p>
              <p className="text-2xl font-bold text-red-600">
                R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredSalaries.filter(s => s.status === 'overdue').length} atrasados
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Valor"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredSalaries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum registro encontrado
              </p>
            ) : (
              filteredSalaries.map((salary) => (
                <div
                  key={salary.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(salary.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Venc: {format(parseISO(salary.due_date), 'dd/MM/yyyy')}
                      </span>
                      {salary.paid_date && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Calendar className="h-3 w-3" />
                          Pago: {format(parseISO(salary.paid_date), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
