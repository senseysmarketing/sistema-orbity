import { DollarSign, Calendar, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExpenseProjectionProps {
  expenseType?: 'avulsa' | 'recorrente' | 'parcelada';
  amount: number;
  recurrenceDay?: number;
  installmentTotal?: number;
  installmentCurrent?: number;
  dueDate: string;
}

export function ExpenseProjection({
  expenseType,
  amount,
  recurrenceDay,
  installmentTotal,
  installmentCurrent,
  dueDate,
}: ExpenseProjectionProps) {
  // Projeção para despesas recorrentes
  if (expenseType === 'recorrente') {
    const projectionMonths = 12;
    const monthlyData = Array.from({ length: projectionMonths }, (_, i) => {
      const projectionDate = addMonths(new Date(), i);
      return {
        month: format(projectionDate, "MMM/yy", { locale: ptBR }),
        valor: amount,
        acumulado: amount * (i + 1),
      };
    });

    const totalProjected = amount * projectionMonths;
    const currentMonth = new Date().getMonth();
    const monthsRemaining = 12 - currentMonth;

    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Projetado (12 meses)</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Média Mensal</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Restante (ano)</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              R$ {(amount * monthsRemaining).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Gráfico de Projeção */}
        <div className="p-4 bg-muted/30 rounded-lg border">
          <h4 className="font-semibold mb-4">Projeção dos Próximos 12 Meses</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="valor" fill="hsl(var(--primary))" name="Mensal (R$)" />
              <Bar yAxisId="right" dataKey="acumulado" fill="hsl(var(--chart-2))" name="Acumulado (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Informações Adicionais */}
        <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
          <h4 className="font-semibold">Informações da Recorrência</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Dia de Vencimento</p>
              <p className="font-semibold">Dia {recurrenceDay || 'não definido'} de cada mês</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Impacto no Orçamento Anual</p>
              <p className="font-semibold text-orange-600">
                {((totalProjected / (amount * 12 * 10)) * 100).toFixed(1)}% do total estimado
              </p>
            </div>
          </div>
        </div>

        {/* Recomendações */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">Recomendações</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Considere agendar pagamento automático para evitar atrasos</li>
                <li>Revise anualmente se o valor ainda está adequado ao serviço prestado</li>
                <li>Mantenha uma reserva de emergência equivalente a 3 meses desta despesa</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Projeção para despesas parceladas
  if (expenseType === 'parcelada' && installmentTotal && installmentCurrent) {
    const remainingInstallments = installmentTotal - installmentCurrent;
    const totalRemaining = amount * remainingInstallments;
    const totalValue = amount * installmentTotal;
    const totalPaid = amount * installmentCurrent;

    const installmentsData = Array.from({ length: Math.min(remainingInstallments, 12) }, (_, i) => {
      const installmentNumber = installmentCurrent + i + 1;
      const projectionDate = addMonths(new Date(dueDate), i);
      return {
        parcela: `${installmentNumber}/${installmentTotal}`,
        month: format(projectionDate, "MMM/yy", { locale: ptBR }),
        valor: amount,
      };
    });

    const pieData = [
      { name: 'Pago', value: totalPaid, color: 'hsl(var(--chart-1))' },
      { name: 'Restante', value: totalRemaining, color: 'hsl(var(--chart-2))' },
    ];

    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Já Pago</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {installmentCurrent}/{installmentTotal} parcelas
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Ainda a Pagar</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              R$ {totalRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingInstallments} parcelas restantes
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Valor Total</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {installmentTotal}x de R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-2 gap-4">
          {/* Gráfico de Pizza */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-4">Distribuição de Pagamento</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Próximas Parcelas */}
          <div className="p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-4">Próximas Parcelas</h4>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {installmentsData.map((installment, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-2 bg-background rounded border"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{installment.parcela}</p>
                      <p className="text-xs text-muted-foreground">{installment.month}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    R$ {installment.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data de Quitação Prevista */}
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100">Quitação Prevista</h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                A última parcela está prevista para{' '}
                <span className="font-semibold">
                  {format(addMonths(new Date(dueDate), remainingInstallments - 1), "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Despesa avulsa - mostrar apenas informações básicas
  return (
    <div className="space-y-6">
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h4 className="font-semibold mb-2">Despesa Avulsa</h4>
        <p className="text-sm text-muted-foreground">
          Esta é uma despesa avulsa que ocorre uma única vez. Não há projeções futuras disponíveis.
        </p>
      </div>

      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor</p>
            <p className="text-xl font-bold text-blue-600">
              R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Data de Vencimento</p>
            <p className="text-xl font-bold">
              {format(new Date(dueDate), "dd/MM/yyyy")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
