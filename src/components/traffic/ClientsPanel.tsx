import { useMemo, useState, useEffect, useRef } from "react";
import { RefreshCw, BarChart3, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { ClientData } from "./ClientCard";
import { ClientListRow } from "./ClientListRow";
import { ClientDetailSheet } from "./ClientDetailSheet";
import { OptimizationReminder } from "./OptimizationReminder";
import { OptimizationSheet } from "./OptimizationSheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ResultsFilter = ClientData["results"] | "all" | "undefined";
type ManagerFilter = "all" | "unassigned" | string;

type AgencyMember = {
  user_id: string;
  role: string;
  profile?: {
    name: string | null;
    email: string | null;
  } | null;
};

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
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, phase: 'connecting' as 'connecting' | 'processing' | 'done' });
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [optimizationClient, setOptimizationClient] = useState<ClientData | null>(null);
  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentAgency } = useAgency();

  const [agencyMembers, setAgencyMembers] = useState<AgencyMember[]>([]);

  // Filtros
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [onlyNeedsOptimization, setOnlyNeedsOptimization] = useState(false);
  const [resultsFilter, setResultsFilter] = useState<ResultsFilter>("all");
  const [managerFilter, setManagerFilter] = useState<ManagerFilter>("all");

  // Flag para evitar chamadas duplicadas
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const mountedRef = useRef(true);

  // Carregar dados do cache primeiro, depois atualizar em background
  useEffect(() => {
    mountedRef.current = true;
    
    if (selectedAdAccounts.length > 0 && currentAgency && !hasLoadedOnce) {
      setHasLoadedOnce(true);
      setLoadingProgress({ current: 0, total: selectedAdAccounts.length, phase: 'connecting' });
      
      // 1. PRIMEIRO: Carregar dados do cache (instantâneo)
      loadClientsFromCache().then((hasCache) => {
        if (!mountedRef.current) return;
        
        if (hasCache) {
          // Se tem cache, mostra dados e atualiza em background
          setInitialLoading(false);
          setIsBackgroundRefresh(true);
          refreshAllDataOnMount().finally(() => {
            if (mountedRef.current) {
              setIsBackgroundRefresh(false);
            }
          });
        } else {
          // Sem cache, mostra loading completo
          refreshAllDataOnMount();
        }
      });
    } else if (selectedAdAccounts.length === 0 && currentAgency) {
      const timeout = setTimeout(() => {
        if (initialLoading && mountedRef.current) {
          setInitialLoading(false);
        }
      }, 1500);
      return () => clearTimeout(timeout);
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, [selectedAdAccounts, currentAgency, hasLoadedOnce]);

  // Carregar membros da agência (para filtro e atribuição de gestor)
  useEffect(() => {
    if (!currentAgency?.id) return;

    (async () => {
      const { data, error } = await supabase
        .from("agency_users")
        .select("user_id, role, profile:profiles!agency_users_user_id_fkey(name, email)")
        .eq("agency_id", currentAgency.id);

      if (error) {
        console.error("Erro ao carregar membros da agência:", error);
        return;
      }

      setAgencyMembers((data as any) || []);
    })();
  }, [currentAgency?.id]);

  const membersMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const m of agencyMembers) {
      const name = m.profile?.name || m.profile?.email || "(Sem nome)";
      map.set(m.user_id, { name });
    }
    return map;
  }, [agencyMembers]);

  const getIsCritical = (c: ClientData) => {
    const isPrepaid = c.is_prepaid === true;
    if (isPrepaid) {
      if (c.min_threshold <= 0) return false;
      return c.balance < c.min_threshold;
    }
    const spendCap = c.spend_cap || 0;
    const amountSpent = c.amount_spent || 0;
    if (spendCap <= 0) return false;
    const percentUsed = (amountSpent / spendCap) * 100;
    return percentUsed >= 90;
  };

  // Regra específica do filtro "Sem saldo / Crítico":
  // - Pré-paga: saldo zerado/negativo OU crítico (abaixo do mínimo)
  // - Pós-paga: apenas crítico (não considerar balance <= 0, pois pode ser fallback)
  const getIsCriticalOrZeroForFilter = (c: ClientData) => {
    const isPrepaid = c.is_prepaid === true;
    if (isPrepaid) {
      if (c.balance <= 0) return true;
      if (c.min_threshold > 0 && c.balance < c.min_threshold) return true;
      return false;
    }
    return getIsCritical(c);
  };

  const getNeedsOptimization = (c: ClientData) => {
    if (!c.last_campaign_update) return true;
    const days = Math.floor((Date.now() - new Date(c.last_campaign_update).getTime()) / (1000 * 60 * 60 * 24));
    return days > 7;
  };

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (onlyCritical && !getIsCriticalOrZeroForFilter(c)) return false;
      if (onlyNeedsOptimization && !getNeedsOptimization(c)) return false;

      if (resultsFilter !== "all") {
        if (resultsFilter === "undefined") {
          if (c.results !== null) return false;
        } else {
          if (c.results !== resultsFilter) return false;
        }
      }

      if (managerFilter !== "all") {
        const resp = c.responsible_user_id;
        if (managerFilter === "unassigned") {
          if (resp) return false;
        } else {
          if (resp !== managerFilter) return false;
        }
      }

      return true;
    });
  }, [clients, onlyCritical, onlyNeedsOptimization, resultsFilter, managerFilter]);

  // Função separada para carregar na montagem (sem toast de sucesso)
  const refreshAllDataOnMount = async () => {
    if (selectedAdAccounts.length === 0) return;

    try {
      const accountIds = selectedAdAccounts.map(acc => acc.ad_account_id);
      setLoadingProgress({ current: 0, total: accountIds.length, phase: 'processing' });
      
      const { data, error } = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds, agencyId: currentAgency?.id }
      });

      if (error) throw error;

      if (data?.summaries && mountedRef.current) {
        // Atualizar progresso conforme recebe dados
        setLoadingProgress({ current: data.summaries.length, total: accountIds.length, phase: 'done' });
        
        const { data: controlsData } = await supabase
          .from('traffic_controls')
          .select('*')
          .eq('agency_id', currentAgency?.id);

        const controlsMap = new Map(
          controlsData?.map(c => [c.ad_account_id || (c.platform_data as any)?.ad_account_id, c]) || []
        );

        const updatedClients: ClientData[] = data.summaries.map((summary: any) => {
          const control = controlsMap.get(summary.ad_account_id);
          return {
            id: summary.ad_account_id,
            ad_account_id: summary.ad_account_id,
            ad_account_name: summary.ad_account_name,
            currency: summary.currency || 'BRL',
            balance: summary.balance || 0,
            min_threshold: 100,
            is_prepaid: summary.is_prepaid,
            current_month_spend: summary.current_month_spend || 0,
            spend_cap: summary.spend_cap || 0,
            amount_spent: summary.amount_spent || 0,
            active_campaigns_count: summary.active_campaigns_count || 0,
            total_daily_budget: summary.total_daily_budget || 0,
            last_7d_spend: summary.last_7d_spend || 0,
            last_campaign_update: summary.last_campaign_update,
            results: control?.results || null,
            observations: control?.observations || null,
            responsible_user_id: (control as any)?.responsible_user_id || null,
          };
        });

        setClients(updatedClients);
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados iniciais:', error);
      // Em caso de erro, tentar carregar do cache
      await loadClientsFromCache();
    } finally {
      if (mountedRef.current) {
        setInitialLoading(false);
        setLoadingProgress(prev => ({ ...prev, phase: 'done' }));
      }
    }
  };

  const loadClientsFromCache = async (): Promise<boolean> => {
    if (!currentAgency) return false;

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
        controlsData?.map(c => [c.ad_account_id || (c.platform_data as any)?.ad_account_id, c]) || []
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
          is_prepaid: account.is_prepaid,
          current_month_spend: account.current_month_spend || 0,
          spend_cap: account.spend_cap || 0,
          amount_spent: account.amount_spent || 0,
          active_campaigns_count: account.active_campaigns_count || 0,
          total_daily_budget: account.total_daily_budget || 0,
          last_7d_spend: account.last_7d_spend || 0,
          last_campaign_update: account.last_campaign_update,
          results: control?.results || null,
          observations: control?.observations || null,
          responsible_user_id: (control as any)?.responsible_user_id || null,
        };
      });

      if (mountedRef.current) {
        setClients(clientsData);
      }
      
      // Verificar se há dados em cache válidos
      const latestCache = accountsData?.reduce((latest, acc) => {
        if (acc.cached_at && (!latest || new Date(acc.cached_at) > new Date(latest))) {
          return acc.cached_at;
        }
        return latest;
      }, null as string | null);

      if (latestCache && mountedRef.current) {
        setLastUpdate(new Date(latestCache));
      }
      
      // Retorna true se tem dados em cache
      const hasValidCache = clientsData.length > 0 && latestCache !== null;
      return hasValidCache;
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      return false;
    }
  };

  const refreshAllData = async () => {
    if (selectedAdAccounts.length === 0) return;

    setLoading(true);
    try {
      const accountIds = selectedAdAccounts.map(acc => acc.ad_account_id);
      
      const { data, error } = await supabase.functions.invoke('facebook-account-summary', {
        body: { accountIds, agencyId: currentAgency?.id }
      });

      if (error) throw error;

      if (data?.summaries) {
        // Buscar configurações do traffic_controls
        const { data: controlsData } = await supabase
          .from('traffic_controls')
          .select('*')
          .eq('agency_id', currentAgency?.id);

        const controlsMap = new Map(
          controlsData?.map(c => [c.ad_account_id || (c.platform_data as any)?.ad_account_id, c]) || []
        );

        const updatedClients: ClientData[] = data.summaries.map((summary: any) => {
          const control = controlsMap.get(summary.ad_account_id);
          const existingClient = clients.find(c => c.ad_account_id === summary.ad_account_id);
          
          return {
            id: existingClient?.id || summary.ad_account_id,
            ad_account_id: summary.ad_account_id,
            ad_account_name: summary.ad_account_name,
            currency: summary.currency || 'BRL',
            balance: summary.balance || 0,
            min_threshold: existingClient?.min_threshold || 100,
            is_prepaid: summary.is_prepaid,
            current_month_spend: summary.current_month_spend || 0,
            spend_cap: summary.spend_cap || 0,
            amount_spent: summary.amount_spent || 0,
            active_campaigns_count: summary.active_campaigns_count || 0,
            total_daily_budget: summary.total_daily_budget || 0,
            last_7d_spend: summary.last_7d_spend || 0,
            last_campaign_update: summary.last_campaign_update,
            results: control?.results || existingClient?.results || null,
            observations: control?.observations || existingClient?.observations || null,
            responsible_user_id: (control as any)?.responsible_user_id ?? existingClient?.responsible_user_id ?? null,
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
      // Buscar registro existente - considerar coluna OU platform_data
      const { data: existingControls } = await supabase
        .from('traffic_controls')
        .select('id, ad_account_id, platform_data')
        .eq('agency_id', currentAgency.id);

      const existingControl = existingControls?.find(c => 
        c.ad_account_id === updatedClient.ad_account_id || 
        (c.platform_data as any)?.ad_account_id === updatedClient.ad_account_id
      );

      const controlData: any = {
        agency_id: currentAgency.id,
        ad_account_id: updatedClient.ad_account_id,
        results: updatedClient.results,
        observations: updatedClient.observations,
        responsible_user_id: updatedClient.responsible_user_id,
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
        body: { accountIds: [accountId], agencyId: currentAgency?.id }
      });

      if (error) throw error;

      if (data?.summaries?.[0]) {
        const summary = data.summaries[0];
        setClients(prev => prev.map(c => 
          c.ad_account_id === accountId 
            ? {
                ...c,
                balance: summary.balance || 0,
                is_prepaid: summary.is_prepaid,
                current_month_spend: summary.current_month_spend || 0,
                spend_cap: summary.spend_cap || 0,
                amount_spent: summary.amount_spent || 0,
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
    const progressPercent = loadingProgress.total > 0 
      ? Math.round((loadingProgress.current / loadingProgress.total) * 100) 
      : 0;
    
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Sincronizando contas de anúncios</h3>
            <p className="text-muted-foreground">
              {loadingProgress.phase === 'connecting' && 'Conectando com o Facebook...'}
              {loadingProgress.phase === 'processing' && `Processando ${loadingProgress.current} de ${loadingProgress.total} contas...`}
              {loadingProgress.phase === 'done' && 'Finalizando...'}
            </p>
          </div>
          
          {/* Barra de Progresso */}
          <div className="w-64 mx-auto space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {progressPercent}% concluído
            </p>
          </div>
          
          {/* Estimativa de tempo */}
          {loadingProgress.phase === 'processing' && loadingProgress.total > 0 && (
            <p className="text-xs text-muted-foreground">
              Tempo estimado: ~{Math.max(5, Math.ceil((loadingProgress.total - loadingProgress.current) * 0.5))} segundos
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Indicador de refresh em background */}
      {isBackgroundRefresh && (
        <div className="fixed bottom-4 left-4 bg-white text-primary px-4 py-2 rounded-full flex items-center gap-2 text-sm z-50 shadow-lg border border-gray-200">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Atualizando em segundo plano...
        </div>
      )}
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
          <Button onClick={refreshAllData} disabled={loading || initialLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || initialLoading) ? 'animate-spin' : ''}`} />
            {(loading || initialLoading) ? 'Atualizando...' : 'Atualizar Todos'}
          </Button>
        </div>
      </div>

      {/* Banner de Lembrete */}
      <OptimizationReminder onNavigateToCampaigns={onNavigateToCampaigns} />

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sem saldo / Crítico</Label>
                  <Switch checked={onlyCritical} onCheckedChange={setOnlyCritical} />
                </div>
                <p className="text-xs text-muted-foreground">Mostra apenas contas críticas ou com saldo zerado.</p>
              </div>

              <div className="space-y-2">
                <Label>Resultados</Label>
                <Select value={resultsFilter} onValueChange={(v) => setResultsFilter(v as ResultsFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="excellent">Excelentes</SelectItem>
                    <SelectItem value="good">Bons</SelectItem>
                    <SelectItem value="average">Médios</SelectItem>
                    <SelectItem value="bad">Ruins</SelectItem>
                    <SelectItem value="terrible">Péssimos</SelectItem>
                    <SelectItem value="undefined">Não definido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gestor</Label>
                <Select value={managerFilter} onValueChange={(v) => setManagerFilter(v as ManagerFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="unassigned">Sem gestor</SelectItem>
                    {agencyMembers.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>
                        {membersMap.get(m.user_id)?.name || m.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Precisa otimizar</Label>
                  <Switch checked={onlyNeedsOptimization} onCheckedChange={setOnlyNeedsOptimization} />
                </div>
                <p className="text-xs text-muted-foreground">Filtra contas sem otimização há 7+ dias.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOnlyCritical(false);
                  setOnlyNeedsOptimization(false);
                  setResultsFilter("all");
                  setManagerFilter("all");
                }}
              >
                Limpar filtros
              </Button>
              <div className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{filteredClients.length}</span> de {clients.length}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {filteredClients.map((client) => (
            <ClientCard
              key={client.ad_account_id}
              client={client}
              agencyMembers={agencyMembers.map((m) => ({ user_id: m.user_id, name: membersMap.get(m.user_id)?.name || m.user_id }))}
              onUpdate={handleUpdateClient}
              onRefreshBalance={handleRefreshBalance}
            />
          ))}
        </div>
      )}
    </div>
    </>
  );
}