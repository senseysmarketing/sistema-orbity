import { useState, useEffect } from "react";
import { Calendar, AlertTriangle, TrendingUp, TrendingDown, Minus, DollarSign, Edit3, RefreshCw, BarChart3, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  is_active: boolean;
  last_sync: string | null;
}

interface ClientOverview {
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  daily_budget: number | null;
  last_optimization: string | null;
  results: 'good' | 'average' | 'bad' | 'excellent' | 'terrible' | null;
  client_notes: string | null;
  average_daily_spend: number | null;
}

interface OverviewSummary {
  total_accounts: number;
  needs_optimization: number;
  average_result_score: number;
  total_daily_budget: number;
  total_daily_spend: number;
  performance_distribution: Record<string, number>;
}

interface OverviewTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function OverviewTab({ selectedAdAccounts }: OverviewTabProps) {
  const [clientsOverview, setClientsOverview] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<ClientOverview | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchClientsOverview();
  }, [selectedAdAccounts]);

  const fetchClientsOverview = async () => {
    try {
      setLoading(true);
      
      const overviewData: ClientOverview[] = [];
      let totalBudget = 0;
      let totalSpend = 0;
      let needsOptimization = 0;
      const performanceDistribution: Record<string, number> = {};
      
      for (const account of selectedAdAccounts) {
        // Tentar buscar dados existentes usando ad_account_id na plataforma data
        const { data: existingData } = await supabase
          .from('traffic_controls')
          .select('*')
          .contains('platform_data', { ad_account_id: account.ad_account_id })
          .maybeSingle();

        // Buscar orçamento da conta via Facebook API se disponível
        let dailyBudget = existingData?.daily_budget || null;
        
        // Buscar métricas dos últimos 7 dias para calcular média de gasto
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: metricsData } = await supabase
          .from('ad_account_metrics')
          .select('spend')
          .eq('ad_account_id', account.ad_account_id)
          .gte('date_start', sevenDaysAgo.toISOString().split('T')[0])
          .order('date_start', { ascending: false });

        // Calcular média de gasto diário dos últimos 7 dias
        const averageDailySpend = metricsData && metricsData.length > 0
          ? metricsData.reduce((sum, record) => sum + (Number(record.spend) || 0), 0) / metricsData.length
          : null;

        const clientOverview: ClientOverview = {
          ad_account_id: account.ad_account_id,
          ad_account_name: account.ad_account_name,
          currency: account.currency,
          daily_budget: dailyBudget,
          last_optimization: existingData?.last_optimization || null,
          results: existingData?.results || null,
          client_notes: existingData?.observations || null,
          average_daily_spend: averageDailySpend,
        };

        // Calcular estatísticas para o resumo
        if (dailyBudget) totalBudget += dailyBudget;
        if (averageDailySpend) totalSpend += averageDailySpend;
        
        if (clientOverview.last_optimization) {
          const daysSince = differenceInDays(new Date(), new Date(clientOverview.last_optimization));
          if (daysSince > 7) needsOptimization++;
        } else {
          needsOptimization++;
        }

        if (clientOverview.results) {
          performanceDistribution[clientOverview.results] = (performanceDistribution[clientOverview.results] || 0) + 1;
        }

        overviewData.push(clientOverview);
      }

      // Calcular resumo
      const summary: OverviewSummary = {
        total_accounts: selectedAdAccounts.length,
        needs_optimization: needsOptimization,
        average_result_score: calculateAverageScore(performanceDistribution),
        total_daily_budget: totalBudget,
        total_daily_spend: totalSpend,
        performance_distribution: performanceDistribution,
      };

      setClientsOverview(overviewData);
      setOverviewSummary(summary);
    } catch (error) {
      console.error('Erro ao carregar overview dos clientes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos clientes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageScore = (distribution: Record<string, number>) => {
    const scoreMap = { terrible: 1, bad: 2, average: 3, good: 4, excellent: 5 };
    let totalScore = 0;
    let totalAccounts = 0;
    
    Object.entries(distribution).forEach(([result, count]) => {
      const score = scoreMap[result as keyof typeof scoreMap] || 0;
      totalScore += score * count;
      totalAccounts += count;
    });
    
    return totalAccounts > 0 ? totalScore / totalAccounts : 0;
  };

  const handleEditClient = (client: ClientOverview) => {
    setEditingClient({ ...client });
    setIsEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;

    try {
      // Buscar se já existe um registro para esta conta usando platform_data
      const { data: existingRecord } = await supabase
        .from('traffic_controls')
        .select('id, client_id')
        .contains('platform_data', { ad_account_id: editingClient.ad_account_id })
        .maybeSingle();

      const updateData = {
        daily_budget: editingClient.daily_budget,
        last_optimization: editingClient.last_optimization,
        results: editingClient.results,
        observations: editingClient.client_notes,
        platform_data: {
          ad_account_id: editingClient.ad_account_id,
          ad_account_name: editingClient.ad_account_name,
          currency: editingClient.currency,
        }
      };

      if (existingRecord) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('traffic_controls')
          .update(updateData)
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Buscar ou criar cliente usando UPSERT para evitar duplicações
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        const agencyId = profile ? 
          (await supabase
            .from('agency_users')
            .select('agency_id')
            .eq('user_id', profile.user_id)
            .single()).data?.agency_id : null;

        if (!agencyId) {
          throw new Error('Agência não encontrada');
        }

        // Tentar buscar cliente existente primeiro
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('name', editingClient.ad_account_name)
          .maybeSingle();

        let clientId: string;

        if (existingClient) {
          // Cliente já existe, usar o ID existente
          clientId = existingClient.id;
        } else {
          // Criar novo cliente apenas se não existir
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              name: editingClient.ad_account_name,
              agency_id: agencyId,
              active: true,
              service: 'Facebook Ads'
            })
            .select('id')
            .single();

          if (clientError) throw clientError;
          clientId = newClient.id;
        }

        // Criar novo registro traffic_controls
        const { error } = await supabase
          .from('traffic_controls')
          .insert({
            ...updateData,
            client_id: clientId,
            agency_id: agencyId,
            platforms: ['facebook'],
          });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Dados do cliente atualizados com sucesso.",
      });

      setIsEditDialogOpen(false);
      setEditingClient(null);
      fetchClientsOverview();
    } catch (error) {
      console.error('Erro ao salvar dados do cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar os dados do cliente.",
        variant: "destructive",
      });
    }
  };

  const getResultsBadge = (results: string | null) => {
    switch (results) {
      case 'excellent':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Excelentes</Badge>;
      case 'good':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Bons</Badge>;
      case 'average':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Médios</Badge>;
      case 'bad':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Ruins</Badge>;
      case 'terrible':
        return <Badge className="bg-red-200 text-red-900 border-red-300">Péssimos</Badge>;
      default:
        return <Badge variant="outline">Não definido</Badge>;
    }
  };

  const getOptimizationWarning = (lastOptimization: string | null) => {
    if (!lastOptimization) return null;
    
    const daysSince = differenceInDays(new Date(), new Date(lastOptimization));
    if (daysSince > 7) {
      return (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Atenção:</strong> Última otimização há {daysSince} dias
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  const formatCurrency = (value: number | null, currency: string) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
    }).format(value);
  };

  const getCardBackgroundColor = (results: string | null) => {
    switch (results) {
      case 'excellent':
        return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800';
      case 'good':
        return 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800';
      case 'average':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800';
      case 'bad':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
      case 'terrible':
        return 'bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-700';
      default:
        return 'bg-card border-border';
    }
  };

  const getPerformanceInsight = () => {
    if (!overviewSummary) return null;
    
    const { average_result_score, needs_optimization, total_accounts } = overviewSummary;
    const optimizationPercentage = (needs_optimization / total_accounts) * 100;
    
    if (optimizationPercentage > 50) {
      return {
        type: 'warning',
        message: `${optimizationPercentage.toFixed(0)}% das contas precisam de otimização urgente`,
        icon: AlertTriangle,
      };
    } else if (average_result_score >= 4) {
      return {
        type: 'success',
        message: 'Performance geral excelente em todas as contas',
        icon: TrendingUp,
      };
    } else if (average_result_score <= 2) {
      return {
        type: 'danger',
        message: 'Performance geral abaixo do esperado - ação necessária',
        icon: TrendingDown,
      };
    }
    
    return {
      type: 'info',
      message: 'Performance moderada - oportunidades de melhoria',
      icon: BarChart3,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const insight = getPerformanceInsight();

  return (
    <div className="space-y-6">
      {/* Header com Resumo e Insights */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Overview dos Clientes</h2>
            <p className="text-muted-foreground">
              Visão geral das contas de anúncios e performance dos clientes
            </p>
          </div>
          <Button 
            onClick={fetchClientsOverview} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards de Resumo */}
        {overviewSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total de Contas</span>
                </div>
                <p className="text-2xl font-bold">{overviewSummary.total_accounts}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Orçamento Total</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(overviewSummary.total_daily_budget, 'USD')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Gasto Médio Total</span>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(overviewSummary.total_daily_spend, 'USD')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Precisam Otimização</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  {overviewSummary.needs_optimization}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Insight Principal */}
        {insight && (
          <Alert className={`${
            insight.type === 'warning' ? 'border-orange-200 bg-orange-50 dark:bg-orange-950' :
            insight.type === 'success' ? 'border-green-200 bg-green-50 dark:bg-green-950' :
            insight.type === 'danger' ? 'border-red-200 bg-red-50 dark:bg-red-950' :
            'border-blue-200 bg-blue-50 dark:bg-blue-950'
          }`}>
            <insight.icon className={`h-4 w-4 ${
              insight.type === 'warning' ? 'text-orange-600' :
              insight.type === 'success' ? 'text-green-600' :
              insight.type === 'danger' ? 'text-red-600' :
              'text-blue-600'
            }`} />
            <AlertDescription className={
              insight.type === 'warning' ? 'text-orange-800 dark:text-orange-200' :
              insight.type === 'success' ? 'text-green-800 dark:text-green-200' :
              insight.type === 'danger' ? 'text-red-800 dark:text-red-200' :
              'text-blue-800 dark:text-blue-200'
            }>
              <strong>Insight:</strong> {insight.message}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientsOverview.map((client) => (
          <Card key={client.ad_account_id} className={`relative ${getCardBackgroundColor(client.results)}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{client.ad_account_name}</CardTitle>
                  <CardDescription className="text-sm">
                    ID: {client.ad_account_id}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditClient(client)}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Orçamento Diário */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Orçamento Diário</span>
                </div>
                <span className="text-sm">
                  {formatCurrency(client.daily_budget, client.currency)}
                </span>
              </div>

              {/* Gasto Diário Médio */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Gasto Diário Médio (7d)</span>
                </div>
                <span className="text-sm">
                  {formatCurrency(client.average_daily_spend, client.currency)}
                </span>
              </div>

              {/* Última Otimização */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Última Otimização</span>
                  </div>
                  <span className="text-sm">
                    {client.last_optimization 
                      ? format(new Date(client.last_optimization + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                      : 'Não registrada'
                    }
                  </span>
                </div>
                {getOptimizationWarning(client.last_optimization)}
              </div>

              {/* Resultados */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Resultados</span>
                {getResultsBadge(client.results)}
              </div>

              {/* Observações */}
              {client.client_notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Observações:</strong> {client.client_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente {editingClient?.ad_account_name}
            </DialogDescription>
          </DialogHeader>

          {editingClient && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="daily_budget">Orçamento Diário ({editingClient.currency})</Label>
                <Input
                  id="daily_budget"
                  type="number"
                  step="0.01"
                  value={editingClient.daily_budget || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    daily_budget: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Ex: 100.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_optimization">Data da Última Otimização</Label>
                <Input
                  id="last_optimization"
                  type="date"
                  value={editingClient.last_optimization || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    last_optimization: e.target.value || null
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="results">Resultados</Label>
                <Select
                  value={editingClient.results || ''}
                  onValueChange={(value) => setEditingClient({
                    ...editingClient,
                    results: value as 'good' | 'average' | 'bad' | 'excellent' | 'terrible' | null
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione os resultados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excelentes</SelectItem>
                    <SelectItem value="good">Bons</SelectItem>
                    <SelectItem value="average">Médios</SelectItem>
                    <SelectItem value="bad">Ruins</SelectItem>
                    <SelectItem value="terrible">Péssimos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_notes">Observações</Label>
                <Textarea
                  id="client_notes"
                  value={editingClient.client_notes || ''}
                  onChange={(e) => setEditingClient({
                    ...editingClient,
                    client_notes: e.target.value || null
                  })}
                  placeholder="Adicione observações sobre o cliente..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveClient}>
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}