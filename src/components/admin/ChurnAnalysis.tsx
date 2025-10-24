import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Users, AlertTriangle, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
  cancelled_at: string | null;
  start_date: string | null;
}

interface ChurnAnalysisProps {
  clients: Client[];
  selectedMonth: string;
}

export function ChurnAnalysis({ clients, selectedMonth }: ChurnAnalysisProps) {
  const churnData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const currentMonthDate = new Date(year, month - 1);
    
    // Clientes ativos no mês
    const activeClients = clients.filter(c => c.active).length;
    
    // Clientes cancelados no mês selecionado
    const cancelledInMonth = clients.filter(c => {
      if (!c.cancelled_at) return false;
      const cancelDate = new Date(c.cancelled_at);
      return cancelDate.getFullYear() === year && cancelDate.getMonth() === month - 1;
    });
    
    const cancelledCount = cancelledInMonth.length;
    
    // Taxa de churn: (clientes cancelados no mês / total de clientes ativos) * 100
    const churnRate = activeClients > 0 ? (cancelledCount / (activeClients + cancelledCount)) * 100 : 0;
    
    // MRR perdido (Monthly Recurring Revenue)
    const lostMRR = cancelledInMonth.reduce((sum, c) => sum + (c.monthly_value || 0), 0);
    
    // Dados dos últimos 6 meses para o gráfico
    const monthlyChurnData = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(year, month - 1 - i);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      
      const monthCancelled = clients.filter(c => {
        if (!c.cancelled_at) return false;
        const cancelDate = new Date(c.cancelled_at);
        return cancelDate.getFullYear() === targetYear && cancelDate.getMonth() === targetMonth;
      });
      
      const monthActive = clients.filter(c => {
        if (c.cancelled_at) {
          const cancelDate = new Date(c.cancelled_at);
          return cancelDate > targetDate;
        }
        return c.active;
      }).length;
      
      const monthChurnRate = monthActive > 0 
        ? (monthCancelled.length / (monthActive + monthCancelled.length)) * 100 
        : 0;
      
      monthlyChurnData.push({
        month: targetDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        churnRate: Number(monthChurnRate.toFixed(2)),
        cancelled: monthCancelled.length,
        active: monthActive
      });
    }
    
    // Calcular média de churn dos últimos 6 meses
    const avgChurnRate = monthlyChurnData.reduce((sum, d) => sum + d.churnRate, 0) / monthlyChurnData.length;
    
    return {
      churnRate,
      cancelledCount,
      activeClients,
      lostMRR,
      monthlyChurnData,
      avgChurnRate,
      cancelledInMonth
    };
  }, [clients, selectedMonth]);

  const getChurnColor = (rate: number) => {
    if (rate < 5) return "text-green-600";
    if (rate < 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getChurnStatus = (rate: number) => {
    if (rate < 5) return { label: "Excelente", variant: "default" as const };
    if (rate < 10) return { label: "Moderado", variant: "secondary" as const };
    return { label: "Atenção", variant: "destructive" as const };
  };

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getChurnColor(churnData.churnRate)}`}>
              {churnData.churnRate.toFixed(2)}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={getChurnStatus(churnData.churnRate).variant}>
                {getChurnStatus(churnData.churnRate).label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Média 6 meses: {churnData.avgChurnRate.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {churnData.cancelledCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes cancelados no mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {churnData.activeClients}
            </div>
            <p className="text-xs text-muted-foreground">
              Base de clientes atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Perdido</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {churnData.lostMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita perdida no mês
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução de Churn */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Churn - Últimos 6 Meses</CardTitle>
          <CardDescription>
            Acompanhe a taxa de cancelamento ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={churnData.monthlyChurnData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" label={{ value: 'Taxa (%)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Clientes', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="churnRate" 
                stroke="hsl(var(--destructive))" 
                name="Taxa de Churn (%)" 
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cancelled" 
                stroke="hsl(var(--warning))" 
                name="Cancelamentos" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Clientes Cancelados no Mês */}
      {churnData.cancelledInMonth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clientes Cancelados Este Mês</CardTitle>
            <CardDescription>
              Detalhamento dos {churnData.cancelledInMonth.length} cliente(s) que cancelaram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {churnData.cancelledInMonth.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cancelado em: {client.cancelled_at ? new Date(client.cancelled_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      -R$ {(client.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">MRR perdido</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {churnData.churnRate > 10 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-300">Taxa de churn elevada</p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Com {churnData.churnRate.toFixed(2)}% de churn, é importante investigar as causas dos cancelamentos e implementar ações de retenção.
                  </p>
                </div>
              </div>
            )}
            
            {churnData.churnRate < churnData.avgChurnRate && (
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-300">Tendência positiva</p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    A taxa de churn está abaixo da média dos últimos 6 meses. Continue focando na satisfação do cliente.
                  </p>
                </div>
              </div>
            )}

            {churnData.lostMRR > 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <TrendingDown className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-300">Impacto Financeiro</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    O churn deste mês representa uma perda de R$ {churnData.lostMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receita recorrente mensal.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
