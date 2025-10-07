import { useState, useEffect } from "react";
import { BarChart3, PieChart, TrendingUp, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useTaskAssignments } from "@/hooks/useTaskAssignments";

interface ReportData {
  totalTasks: number;
  completedTasks: number;
  personalTasksCompleted: number;
  activeClients: number;
  monthlyRevenue: number;
  pendingPayments: number;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalTasks: 0,
    completedTasks: 0,
    personalTasksCompleted: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState("general");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const { assignments, fetchAssignments } = useTaskAssignments();

  useEffect(() => {
    fetchReportData();
  }, [profile, assignments]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Buscar dados gerais - filtrados por agência
      if (!currentAgency) return;
      
      const [
        { data: tasks },
        { data: personalTasks },
        { data: clients },
        { data: payments }
      ] = await Promise.all([
        supabase.from('tasks').select('*').eq('agency_id', currentAgency.id),
        supabase.from('personal_tasks').select('completed, user_id').eq('user_id', profile?.user_id || ''),
        supabase.from('clients').select('active, monthly_value').eq('agency_id', currentAgency.id),
        supabase.from('client_payments').select('status, amount').eq('agency_id', currentAgency.id)
      ]);

      // Buscar atribuições de tarefas
      await fetchAssignments();

      const totalTasks = tasks?.length || 0;
      
      // Calcular tarefas do usuário baseado nas atribuições
      const myTaskIds = assignments
        .filter(a => a.user_id === profile?.user_id)
        .map(a => a.task_id);
      
      const myTasks = tasks?.filter(t => myTaskIds.includes(t.id)) || [];
      const completedTasks = myTasks.filter(t => t.status === 'done').length;
      
      const personalTasksCompleted = personalTasks?.filter(t => t.completed).length || 0;
      const activeClients = clients?.filter(c => c.active).length || 0;
      const monthlyRevenue = clients?.filter(c => c.active).reduce((sum, c) => sum + (c.monthly_value || 0), 0) || 0;
      const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;

      setReportData({
        totalTasks: myTasks.length,
        completedTasks,
        personalTasksCompleted,
        activeClients,
        monthlyRevenue,
        pendingPayments,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    // Implementar exportação de relatório
    toast({
      title: "Exportando relatório",
      description: "Funcionalidade em desenvolvimento.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise e métricas de desempenho
          </p>
        </div>
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tipo de Relatório" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="tasks">Tarefas</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Seletor de data em desenvolvimento</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportData.totalTasks > 0 
                ? Math.round((reportData.completedTasks / reportData.totalTasks) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {reportData.completedTasks} de {reportData.totalTasks} tarefas concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              contratos em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {reportData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              valor total dos contratos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises Detalhadas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Desempenho de Tarefas</CardTitle>
            <CardDescription>
              Análise de produtividade da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Tarefas Gerais</span>
                  <span>{reportData.completedTasks}/{reportData.totalTasks}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ 
                      width: `${reportData.totalTasks > 0 ? (reportData.completedTasks / reportData.totalTasks) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Tarefas Pessoais</span>
                  <span>{reportData.personalTasksCompleted}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min(reportData.personalTasksCompleted * 10, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Situação Financeira</CardTitle>
            <CardDescription>
              Resumo financeiro atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Receita Mensal</span>
                <span className="text-lg font-bold text-green-600">
                  R$ {reportData.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pagamentos Pendentes</span>
                <span className="text-lg font-bold text-orange-600">
                  R$ {reportData.pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Clientes Ativos</span>
                <span className="text-lg font-bold">
                  {reportData.activeClients}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
          <CardDescription>
            Análise automática dos dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.totalTasks > 0 && (reportData.completedTasks / reportData.totalTasks) < 0.7 && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  📊 Taxa de Conclusão Baixa
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  A taxa de conclusão de tarefas está abaixo de 70%. Considere revisar a distribuição de tarefas e prazos.
                </p>
              </div>
            )}
            
            {reportData.pendingPayments > reportData.monthlyRevenue && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200">
                  💰 Atenção aos Recebimentos
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  O valor de pagamentos pendentes é superior à receita mensal. Priorize a cobrança.
                </p>
              </div>
            )}
            
            {reportData.activeClients >= 10 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200">
                  🎉 Ótima Base de Clientes
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Parabéns! Você tem uma base sólida de {reportData.activeClients} clientes ativos.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}