import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

interface SalaryProjectionProps {
  salary: Salary;
  relatedSalaries: Salary[];
}

export function SalaryProjection({ salary, relatedSalaries }: SalaryProjectionProps) {
  // Projeção para os próximos 6 meses
  const projectionData = useMemo(() => {
    const months = [];
    const today = new Date();
    
    for (let i = 0; i < 6; i++) {
      const month = addMonths(today, i);
      months.push({
        month: format(month, 'MMM/yy', { locale: ptBR }),
        projetado: salary.amount,
        acumulado: salary.amount * (i + 1)
      });
    }
    
    return months;
  }, [salary]);

  // Análise de pagamentos dos últimos 12 meses
  const paymentAnalysis = useMemo(() => {
    const onTime = relatedSalaries.filter(s => {
      if (!s.paid_date) return false;
      const due = new Date(s.due_date);
      const paid = new Date(s.paid_date);
      return paid <= due;
    }).length;

    const late = relatedSalaries.filter(s => {
      if (!s.paid_date) return s.status === 'overdue';
      const due = new Date(s.due_date);
      const paid = new Date(s.paid_date);
      return paid > due;
    }).length;

    const pending = relatedSalaries.filter(s => s.status === 'pending').length;

    return [
      { name: 'Em Dia', value: onTime, color: '#10b981' },
      { name: 'Atrasados', value: late, color: '#ef4444' },
      { name: 'Pendentes', value: pending, color: '#f59e0b' }
    ];
  }, [relatedSalaries]);

  const totalProjected = projectionData.reduce((acc, item) => acc + item.projetado, 0);

  return (
    <div className="space-y-4 mt-4">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Projeção 6 Meses
              </p>
              <p className="text-2xl font-bold text-primary">
                R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {salary.employee_name}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Valor Mensal
              </p>
              <p className="text-2xl font-bold text-green-600">
                R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                Fixo mensal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Projeção */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projeção de Gastos - Próximos 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="projetado" fill="#3b82f6" name="Valor Mensal" />
              <Bar dataKey="acumulado" fill="#10b981" name="Acumulado" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Gráfico de Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise de Pontualidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={paymentAnalysis}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentAnalysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {paymentAnalysis.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm">
              💡 <strong>Planejamento:</strong> Reserve R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
              por mês para este salário nos próximos 6 meses.
            </p>
          </div>
          
          {paymentAnalysis.find(p => p.name === 'Atrasados' && p.value > 0) && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <p className="text-sm">
                ⚠️ <strong>Atenção:</strong> Histórico de atrasos detectado. 
                Configure lembretes automáticos para evitar novos atrasos.
              </p>
            </div>
          )}
          
          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <p className="text-sm">
              ✅ <strong>Dica:</strong> Automatize o pagamento deste salário para garantir pontualidade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
