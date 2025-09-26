import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Target, Eye, Download, RefreshCw, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { DatePickerWithRange } from "@/components/ui/date-picker";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface TrafficDashboardProps {
  selectedAdAccounts: SelectedAdAccount[];
}

interface MetricsData {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  accountBalance: number;
}

interface ChartData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export function TrafficDashboard({ selectedAdAccounts }: TrafficDashboardProps) {
  const [metricsData, setMetricsData] = useState<MetricsData>({
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    cpm: 0,
    cpc: 0,
    ctr: 0,
    accountBalance: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");

  // Selecionar primeira conta automaticamente
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(selectedAdAccounts[0].ad_account_id);
    }
  }, [selectedAdAccounts, selectedAccount]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    to: new Date()
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedAdAccounts, selectedAccount, dateRange]);

  const fetchDashboardData = async () => {
    if (selectedAdAccounts.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar métricas do banco de dados
      let query = supabase
        .from('ad_account_metrics')
        .select('*')
        .gte('date_start', dateRange.from.toISOString().split('T')[0])
        .lte('date_end', dateRange.to.toISOString().split('T')[0]);

      // Filtrar apenas pela conta selecionada
      if (selectedAccount) {
        query = query.eq('ad_account_id', selectedAccount);
      }

      const { data: metrics, error } = await query.order('date_start', { ascending: true });

      if (error) throw error;

      // Processar dados para métricas agregadas
      const aggregatedMetrics = metrics?.reduce((acc, metric) => ({
        spend: acc.spend + (metric.spend || 0),
        impressions: acc.impressions + (metric.impressions || 0),
        clicks: acc.clicks + (metric.clicks || 0),
        conversions: acc.conversions + (metric.conversions || 0),
        cpm: acc.cpm + (metric.cpm || 0),
        cpc: acc.cpc + (metric.cpc || 0),
        ctr: acc.ctr + (metric.ctr || 0),
        accountBalance: Math.max(acc.accountBalance, metric.account_balance || 0)
      }), {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0,
        accountBalance: 0
      }) || metricsData;

      // Calcular médias para CPM, CPC, CTR
      const metricsCount = metrics?.length || 1;
      aggregatedMetrics.cpm = aggregatedMetrics.cpm / metricsCount;
      aggregatedMetrics.cpc = aggregatedMetrics.cpc / metricsCount;
      aggregatedMetrics.ctr = aggregatedMetrics.ctr / metricsCount;

      setMetricsData(aggregatedMetrics);

      // Processar dados para gráficos
      const chartDataProcessed = metrics?.map(metric => ({
        date: new Date(metric.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        spend: metric.spend || 0,
        impressions: metric.impressions || 0,
        clicks: metric.clicks || 0,
        conversions: metric.conversions || 0
      })) || [];

      setChartData(chartDataProcessed);

    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    
    try {
      // Chamar edge function para sincronizar dados
      const { error } = await supabase.functions.invoke('facebook-sync', {
        body: { 
          action: 'sync_metrics',
          accountIds: selectedAccount ? [selectedAccount] : [],
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          }
        }
      });

      if (error) throw error;
      
      // Recarregar dados
      await fetchDashboardData();
      
      toast({
        title: "Dados atualizados!",
        description: "As métricas foram sincronizadas com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao sincronizar:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível atualizar os dados.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const checkBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-balance', {
        body: { 
          accountIds: selectedAccount ? [selectedAccount] : []
        }
      });

      if (error) throw error;
      
      toast({
        title: "Saldo verificado!",
        description: `Saldo total: ${data.totalBalance} ${data.currency}`,
      });
    } catch (error: any) {
      console.error('Erro ao verificar saldo:', error);
      toast({
        title: "Erro ao verificar saldo",
        description: "Não foi possível verificar o saldo das contas.",
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    toast({
      title: "Exportando relatório...",
      description: "O PDF será gerado em breve.",
    });
    // TODO: Implementar geração de PDF
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros e Controles */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecionar conta" />
            </SelectTrigger>
            <SelectContent>
              {selectedAdAccounts.map((account) => (
                <SelectItem key={account.ad_account_id} value={account.ad_account_id}>
                  {account.ad_account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* <DatePickerWithRange 
            date={dateRange}
            onDateChange={(range) => range && setDateRange(range)}
          /> */}
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            {dateRange.from.toLocaleDateString('pt-BR')} - {dateRange.to.toLocaleDateString('pt-BR')}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={checkBalance} variant="outline">
            <DollarSign className="h-4 w-4 mr-2" />
            Verificar Saldo
          </Button>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(metricsData.spend)}
            </div>
            <p className="text-xs text-muted-foreground">
              nos últimos {Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} dias
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR').format(metricsData.impressions)}
            </div>
            <p className="text-xs text-muted-foreground">
              CPM: {metricsData.cpm.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliques</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR').format(metricsData.clicks)}
            </div>
            <p className="text-xs text-muted-foreground">
              CTR: {metricsData.ctr.toFixed(2)}% | CPC: R$ {metricsData.cpc.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversões</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR').format(metricsData.conversions)}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa: {((metricsData.conversions / metricsData.clicks) * 100 || 0).toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por Dia</CardTitle>
            <CardDescription>Evolução do investimento diário</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
                    'Gasto'
                  ]}
                />
                <Area type="monotone" dataKey="spend" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impressões vs Cliques</CardTitle>
            <CardDescription>Alcance e engajamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [new Intl.NumberFormat('pt-BR').format(Number(value))]} />
                <Line type="monotone" dataKey="impressions" stroke="#82ca9d" name="Impressões" />
                <Line type="monotone" dataKey="clicks" stroke="#ffc658" name="Cliques" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Conversões */}
      <Card>
        <CardHeader>
          <CardTitle>Conversões por Dia</CardTitle>
          <CardDescription>Performance de conversões ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [value, 'Conversões']} />
              <Bar dataKey="conversions" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}