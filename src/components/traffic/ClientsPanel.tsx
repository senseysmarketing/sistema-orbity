import { useState, useEffect } from "react";
import { RefreshCw, BarChart3, AlertTriangle, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { ClientCard, ClientData } from "./ClientCard";
import { OptimizationReminder } from "./OptimizationReminder";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
  is_active: boolean;
  last_sync: string | null;
  // Novos campos de cache
  last_campaign_update?: string | null;
  active_campaigns_count?: number;
  total_daily_budget?: number;
  last_7d_spend?: number;
  balance?: number;
  min_threshold?: number;
  cached_at?: string | null;
}

interface ClientsPanelProps {
  selectedAdAccounts: SelectedAdAccount[];
  onNavigateToCampaigns?: () => void;
}

export function ClientsPanel({ selectedAdAccounts, onNavigateToCampaigns }: ClientsPanelProps) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();
  const { currentAgency } = useAgency();

  // Carregar dados iniciais do cache
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && currentAgency) {
      loadClientsFromCache();
    } else if (selectedAdAccounts.length === 0) {
      setInitialLoading(false);
    }
  }, [selectedAdAccounts, currentAgency]);

  const loadClientsFromCache = async () => {
    if (!currentAgency) return;

    try {
      // Buscar dados do banco com os campos de cache
      const { data: accountsData, error } = await supabase
        .from('selected_ad_accounts')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true);

      if (error) throw error;

      // Buscar configurações de resultados/observações do traffic_controls
      const { data: controlsData } = await supabase
        .from('traffic_controls')
        .select('*')
        .eq('agency_id', currentAgency.id);

      const controlsMap = new Map(
        controlsData?.map(c => [c.ad_account_id, c]) || []
      );

      const clientsData: ClientData[] = (accountsData || []).map(account => {
        const control = controlsMap.get(account.ad_account_id);
        return {
          id: account.id,
          ad_account_id: account.ad_account_id,
          ad_account_name: account.ad_account_name,
          currency: account.currency || 'BRL',
          balance: account.balance || 0,
          min_threshold: account.min_threshold || 100,
          active_campaigns_count: account.active_campaigns_count || 0,
          total_daily_budget: account.total_daily_budget || 0,
          last_7d_spend: account.last_7d_spend || 0,
          last_campaign_update: account.last_campaign_update,
          results: control?.results || null,
          observations: control?.observations || null,
        };
      });

      setClients(clientsData);
      
      // Verificar se há dados em cache
      const latestCache = accountsData?.reduce((latest, acc) => {
        if (acc.cached_at && (!latest || new Date(acc.cached_at) > new Date(latest))) {
          return acc.cached_at;
        }
        return latest;
      }, null as string | null);

      if (latestCache) {
        setLastUpdate(new Date(latestCache));
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const refreshAllData = async () => {
    if (selectedAdAccounts.length === 0) return;

    setLoading(true);
    try {
      const accountIds = selectedAdAccounts.map(acc => acc.ad_account_id);
      
      const { data, error } = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds }
      });

      if (error) throw error;

      if (data?.summaries) {
        // Buscar configurações do traffic_controls
        const { data: controlsData } = await supabase
          .from('traffic_controls')
          .select('*')
          .eq('agency_id', currentAgency?.id);

        const controlsMap = new Map(
          controlsData?.map(c => [c.ad_account_id, c]) || []
        );

        const updatedClients: ClientData[] = data.summaries.map((summary: any) => {
          const control = controlsMap.get(summary.ad_account_id);
          const existingClient = clients.find(c => c.ad_account_id === summary.ad_account_id);
          const savedThreshold = control?.observations ? 100 : 100; // Default threshold
          
          return {
            id: existingClient?.id || summary.ad_account_id,
            ad_account_id: summary.ad_account_id,
            ad_account_name: summary.ad_account_name,
            currency: summary.currency || 'BRL',
            balance: summary.balance || 0,
            min_threshold: existingClient?.min_threshold || 100,
            is_prepaid: summary.is_prepaid,
            active_campaigns_count: summary.active_campaigns_count || 0,
            total_daily_budget: summary.total_daily_budget || 0,
            last_7d_spend: summary.last_7d_spend || 0,
            last_campaign_update: summary.last_campaign_update,
            results: control?.results || existingClient?.results || null,
            observations: control?.observations || existingClient?.observations || null,
          };
        });

        setClients(updatedClients);
        setLastUpdate(new Date());

        const criticalCount = updatedClients.filter(c => c.balance <= c.min_threshold * 0.5).length;
        const warningCount = updatedClients.filter(c => c.balance <= c.min_threshold && c.balance > c.min_threshold * 0.5).length;

        if (criticalCount > 0) {
          toast({
            title: "⚠️ Saldo Crítico!",
            description: `${criticalCount} conta(s) com saldo muito baixo precisam de atenção imediata.`,
            variant: "destructive",
          });
        } else if (warningCount > 0) {
          toast({
            title: "🔶 Atenção",
            description: `${warningCount} conta(s) estão próximas do limite mínimo.`,
          });
        } else {
          toast({
            title: "✅ Dados atualizados",
            description: "Todas as contas foram sincronizadas com sucesso.",
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar dados:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível sincronizar os dados com o Facebook.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClient = async (updatedClient: ClientData) => {
    if (!currentAgency) return;

    try {
      // Atualizar min_threshold na tabela selected_ad_accounts
      await supabase
        .from('selected_ad_accounts')
        .update({ min_threshold: updatedClient.min_threshold })
        .eq('ad_account_id', updatedClient.ad_account_id)
        .eq('agency_id', currentAgency.id);

      // Atualizar ou criar registro no traffic_controls
      const { data: existingControl } = await supabase
        .from('traffic_controls')
        .select('id')
        .eq('ad_account_id', updatedClient.ad_account_id)
        .eq('agency_id', currentAgency.id)
        .maybeSingle();

      const controlData = {
        agency_id: currentAgency.id,
        ad_account_id: updatedClient.ad_account_id,
        results: updatedClient.results,
        observations: updatedClient.observations,
        min_threshold: updatedClient.min_threshold,
        platform_data: {
          ad_account_name: updatedClient.ad_account_name,
          currency: updatedClient.currency,
        }
      };

      if (existingControl) {
        await supabase
          .from('traffic_controls')
          .update(controlData)
          .eq('id', existingControl.id);
      } else {
        await supabase
          .from('traffic_controls')
          .insert({
            ...controlData,
            platforms: ['facebook'],
          });
      }

      // Atualizar estado local
      setClients(prev => prev.map(c => 
        c.ad_account_id === updatedClient.ad_account_id ? updatedClient : c
      ));

      toast({
        title: "✅ Salvo",
        description: "Dados do cliente atualizados com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshBalance = async (accountId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds: [accountId] }
      });

      if (error) throw error;

      if (data?.summaries?.[0]) {
        const summary = data.summaries[0];
        setClients(prev => prev.map(c => 
          c.ad_account_id === accountId 
            ? {
                ...c,
                balance: summary.balance || 0,
                active_campaigns_count: summary.active_campaigns_count || 0,
                total_daily_budget: summary.total_daily_budget || 0,
                last_7d_spend: summary.last_7d_spend || 0,
                last_campaign_update: summary.last_campaign_update,
              }
            : c
        ));

        toast({
          title: "✅ Atualizado",
          description: `Dados de ${summary.ad_account_name} atualizados.`,
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar saldo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados desta conta.",
        variant: "destructive",
      });
    }
  };

  // Calcular estatísticas
  const stats = {
    total: clients.length,
    healthy: clients.filter(c => c.balance > c.min_threshold).length,
    warning: clients.filter(c => c.balance <= c.min_threshold && c.balance > c.min_threshold * 0.5).length,
    critical: clients.filter(c => c.balance <= c.min_threshold * 0.5).length,
    needsOptimization: clients.filter(c => {
      if (!c.last_campaign_update) return true;
      const days = Math.floor((Date.now() - new Date(c.last_campaign_update).getTime()) / (1000 * 60 * 60 * 24));
      return days > 7;
    }).length,
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Carregando dados dos clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel de Clientes</h2>
          <p className="text-muted-foreground">
            Visão geral das contas de anúncios e saldos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Última atualização: {format(lastUpdate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          )}
          <Button onClick={refreshAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar Todos'}
          </Button>
        </div>
      </div>

      {/* Banner de Lembrete */}
      <OptimizationReminder onNavigateToCampaigns={onNavigateToCampaigns} />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Saudáveis</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Atenção</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Críticos</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Otimizar</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.needsOptimization}</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Cards de Clientes */}
      {clients.length === 0 ? (
        <Alert>
          <AlertDescription>
            Nenhuma conta de anúncios encontrada. Clique em "Atualizar Todos" para sincronizar os dados.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.ad_account_id}
              client={client}
              onUpdate={handleUpdateClient}
              onRefreshBalance={handleRefreshBalance}
            />
          ))}
        </div>
      )}
    </div>
  );
}