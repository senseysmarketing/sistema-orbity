import { useState, useEffect } from "react";
import { RefreshCw, FileText, TrendingUp, DollarSign, Eye, Target, BarChart, Play, Sparkles, Copy, RotateCcw, Loader2, Share2, ChevronDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useAgency } from "@/hooks/useAgency";
import { DateRange } from "react-day-picker";
import { ReportGeneratorModal } from "./ReportGeneratorModal";
import { useAIAssist } from "@/hooks/useAIAssist";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getObjectiveResult,
  getCostPerResult,
  groupResultsByObjective,
  formatCostPerResult,
  type ResultByObjective,
} from "./utils/objectiveMapping";

// Mapa de tradução de action_types da Meta API
const ACTION_TYPE_LABELS: Record<string, string> = {
  'lead': 'Leads',
  'purchase': 'Compras',
  'complete_registration': 'Cadastros',
  'onsite_conversion.messaging_conversation_started_7d': 'Conversas Iniciadas',
  'onsite_conversion.messaging_first_reply': 'Primeiras Respostas',
  'link_click': 'Cliques no Link',
  'landing_page_view': 'Visualizações da Página',
  'page_engagement': 'Engajamento na Página',
  'post_engagement': 'Engajamento no Post',
  'video_view': 'Visualizações de Vídeo',
  'omni_app_install': 'Instalações do App',
  'onsite_web_app_add_to_cart': 'Adições ao Carrinho',
  'initiate_checkout': 'Checkouts Iniciados',
  'add_payment_info': 'Info de Pagamento',
  'search': 'Buscas',
  'add_to_wishlist': 'Lista de Desejos',
  'contact': 'Contatos',
  'submit_application': 'Formulários Enviados',
  'schedule': 'Agendamentos',
};

function getActionTypeLabel(actionType: string): string {
  if (ACTION_TYPE_LABELS[actionType]) return ACTION_TYPE_LABELS[actionType];
  // Handle offsite_conversion.* and onsite_conversion.*
  if (actionType.startsWith('offsite_conversion.')) {
    const sub = actionType.replace('offsite_conversion.fb_pixel_', '').replace(/_/g, ' ');
    return `Conv. Offsite: ${sub.charAt(0).toUpperCase() + sub.slice(1)}`;
  }
  if (actionType.startsWith('onsite_conversion.')) {
    const sub = actionType.replace('onsite_conversion.', '').replace(/_/g, ' ');
    return `Conv.: ${sub.charAt(0).toUpperCase() + sub.slice(1)}`;
  }
  return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

interface ActionData {
  action_type: string;
  value: string | number;
}

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  objective: string;
  updated_time?: string;
  daily_budget?: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  actions?: ActionData[];
  ctr: number;
  cpc: number;
}

interface MetricsData {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  allActions?: { action_type: string; value: number }[];
}

interface ChartData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  actions?: ActionData[];
}

interface CampaignsAndReportsProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function CampaignsAndReports({ selectedAdAccounts }: CampaignsAndReportsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<MetricsData>({
    spend: 0, impressions: 0, clicks: 0, conversions: 0, cpm: 0, cpc: 0, ctr: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 2, step: '' });
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Record<string, string>>({});
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [selectedActionType, setSelectedActionType] = useState<string>("__default__");
  const [availableActions, setAvailableActions] = useState<{ action_type: string; value: number }[]>([]);
  const [actionSelectorOpen, setActionSelectorOpen] = useState(false);
  const { toast } = useToast();
  const { analyzeCampaign } = useAIAssist();
  const { currentAgency } = useAgency();

  // Selecionar primeira conta automaticamente
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(selectedAdAccounts[0].ad_account_id);
    }
  }, [selectedAdAccounts, selectedAccount]);

  // Buscar dados quando conta ou período mudar
  useEffect(() => {
    if (selectedAccount && dateRange?.from && dateRange?.to) {
      fetchAllData();
    }
  }, [selectedAccount, dateRange]);

  const fetchAllData = async (isBackground = false) => {
    if (!selectedAccount || !dateRange?.from || !dateRange?.to || !currentAgency?.id) return;

    if (isBackground) {
      setIsBackgroundRefresh(true);
    } else {
      setLoading(true);
      setLoadingProgress({ current: 0, total: 2, step: 'Conectando com o Facebook...' });
    }

    try {
      // Etapa 1: Buscar campanhas
      if (!isBackground) {
        setLoadingProgress({ current: 1, total: 2, step: 'Carregando campanhas...' });
      }

      const { data: campaignsData, error: campaignsError } = await supabase.functions.invoke('facebook-campaigns', {
        body: { 
          action: 'list_campaigns',
          agencyId: currentAgency.id,
          accountIds: [selectedAccount],
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          }
        }
      });

      if (campaignsError) throw campaignsError;
      const fetchedCampaigns = campaignsData?.campaigns || [];
      setCampaigns(fetchedCampaigns);

      // Etapa 2: Buscar métricas agregadas
      if (!isBackground) {
        setLoadingProgress({ current: 2, total: 2, step: 'Processando métricas...' });
      }

      const { data: metricsData, error: metricsError } = await supabase.functions.invoke('facebook-sync', {
        body: { 
          action: 'get_metrics',
          agencyId: currentAgency.id,
          accountIds: [selectedAccount],
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          }
        }
      });

      if (!metricsError && metricsData?.metrics) {
        setMetrics(metricsData.metrics);
        setChartData(metricsData.chartData || []);

        // Populate available actions from aggregated data
        if (metricsData.metrics.allActions && metricsData.metrics.allActions.length > 0) {
          setAvailableActions(metricsData.metrics.allActions);
        }
      } else {
        // Calcular métricas a partir das campanhas
        const activeCamps = campaignsData?.campaigns?.filter((c: Campaign) => c.status === 'ACTIVE') || [];
        const totalSpend = activeCamps.reduce((sum: number, c: Campaign) => sum + c.spend, 0);
        const totalImpressions = activeCamps.reduce((sum: number, c: Campaign) => sum + c.impressions, 0);
        const totalClicks = activeCamps.reduce((sum: number, c: Campaign) => sum + c.clicks, 0);
        const totalConversions = activeCamps.reduce((sum: number, c: Campaign) => sum + c.conversions, 0);
        
        // Aggregate actions from campaigns
        const actionsMap: Record<string, number> = {};
        for (const c of activeCamps) {
          if (c.actions) {
            for (const a of c.actions) {
              const key = a.action_type;
              actionsMap[key] = (actionsMap[key] || 0) + (parseInt(String(a.value)) || 0);
            }
          }
        }
        const aggActions = Object.entries(actionsMap).map(([action_type, value]) => ({ action_type, value }));
        setAvailableActions(aggActions);

        setMetrics({
          spend: totalSpend,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
          cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
          ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        });

        // Gerar dados de gráfico mock se não vier da API
        generateMockChartData();
      }

      // Auto-detect best action type based on campaign objectives
      if (selectedActionType === '__default__' && fetchedCampaigns.length > 0) {
        const objectiveCounts: Record<string, number> = {};
        for (const c of fetchedCampaigns) {
          objectiveCounts[c.objective] = (objectiveCounts[c.objective] || 0) + 1;
        }
        const topObjective = Object.entries(objectiveCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        
        if (topObjective === 'OUTCOME_LEADS') {
          setSelectedActionType('lead');
        } else if (topObjective === 'OUTCOME_ENGAGEMENT' || topObjective === 'MESSAGES') {
          setSelectedActionType('onsite_conversion.messaging_conversation_started_7d');
        } else if (topObjective === 'OUTCOME_SALES') {
          setSelectedActionType('purchase');
        } else {
          setSelectedActionType('lead');
        }
      }

      setHasInitialData(true);
    } catch (error: any) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as campanhas e métricas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsBackgroundRefresh(false);
    }
  };

  const generateMockChartData = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const days = differenceInDays(dateRange.to, dateRange.from);
    const mockData: ChartData[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(dateRange.from.getTime() + i * 24 * 60 * 60 * 1000);
      mockData.push({
        date: format(date, 'dd/MM'),
        spend: Math.random() * 200 + 50,
        impressions: Math.floor(Math.random() * 8000) + 2000,
        clicks: Math.floor(Math.random() * 200) + 50,
        conversions: Math.floor(Math.random() * 8) + 1
      });
    }
    
    setChartData(mockData);
  };

  const handleWeeklyAnalysis = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }

    const campaign = campaigns.find(c => c.id === campaignId);
    setExpandedCampaign(campaignId);
    setLoadingAnalysis(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-analysis', {
        body: { 
          campaign_id: campaignId,
          agencyId: currentAgency?.id,
          accounts: [selectedAccount]
        }
      });

      if (error) throw error;

      const processedData = data?.weekly_data?.map((week: any, index: number) => {
        let weekLabel = `Semana ${index + 1}`;
        if (week.date_start && week.date_stop) {
          const ds = format(new Date(week.date_start + 'T00:00:00'), 'dd/MM');
          const de = format(new Date(week.date_stop + 'T00:00:00'), 'dd/MM');
          weekLabel = `Semana ${index + 1} (${ds} a ${de})`;
        }
        return {
          ...week,
          week: weekLabel,
        };
      }) || [];

      setWeeklyAnalysis(processedData);

      // Auto-trigger AI analysis
      if (processedData.length > 0 && campaign && !aiAnalysis[campaignId]) {
        handleAIAnalysisWithData(campaign, processedData);
      }
    } catch (error) {
      console.error('Erro na análise semanal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a análise semanal.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleAIAnalysisWithData = async (campaign: Campaign, weekData?: any[]) => {
    if (!currentAgency?.id) return;
    const data = weekData || weeklyAnalysis;
    if (data.length === 0) return;
    
    setAiAnalysisLoading(campaign.id);
    try {
      const weeklyDataText = data.map((week) => {
        const dateInfo = week.date_start && week.date_stop ? ` [${week.date_start} a ${week.date_stop}]` : '';
        return `${week.week}${dateInfo}: Gasto R$${(week.spend || 0).toFixed(2)}, Conversões: ${week.conversions || 0}, CPC: R$${(week.cpc || 0).toFixed(2)}, CTR: ${(week.ctr || 0).toFixed(2)}%, Impressões: ${week.impressions || 0}, Cliques: ${week.clicks || 0}`;
      }).join('\n');
      
      const content = `Campanha: ${campaign.name}\nObjetivo: ${getObjectiveLabel(campaign.objective)}\nStatus: ${campaign.status}\n\nDados semanais:\n${weeklyDataText}`;
      
      const result = await analyzeCampaign(content, currentAgency.id);
      if (result?.analysis) {
        setAiAnalysis(prev => ({ ...prev, [campaign.id]: result.analysis }));
      }
    } catch (error) {
      console.error('Erro na análise IA:', error);
      toast({ title: "Erro", description: "Não foi possível gerar a análise.", variant: "destructive" });
    } finally {
      setAiAnalysisLoading(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      ACTIVE: { label: 'Ativo', variant: 'default' },
      PAUSED: { label: 'Pausado', variant: 'secondary' },
      DELETED: { label: 'Excluído', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.ACTIVE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getObjectiveLabel = (objective: string) => {
    const objectives: Record<string, string> = {
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_AWARENESS': 'Reconhecimento',
    };
    return objectives[objective] || objective;
  };

  const truncateText = (text: string, limit: number = 35) => {
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Análise copiada para a área de transferência." });
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');
  const selectedAccountName = selectedAdAccounts.find(a => a.ad_account_id === selectedAccount)?.ad_account_name || '';

  // Compute dynamic conversion values based on selected action type
  const currentActionLabel = selectedActionType === '__default__' ? 'Conversões' : getActionTypeLabel(selectedActionType);

  const computeConversionsForActions = (actions?: ActionData[], fallbackConversions?: number): number => {
    if (!actions || actions.length === 0 || selectedActionType === '__default__') return fallbackConversions || 0;
    const match = actions.find(a => a.action_type === selectedActionType);
    return match ? (parseInt(String(match.value)) || 0) : 0;
  };

  const dynamicTotalConversions = selectedActionType === '__default__'
    ? metrics.conversions
    : (metrics.allActions?.find(a => a.action_type === selectedActionType)?.value ||
       activeCampaigns.reduce((sum, c) => sum + computeConversionsForActions(c.actions, 0), 0));

  // Sorted available actions for the selector
  const sortedAvailableActions = [...availableActions].sort((a, b) => b.value - a.value);

  // ===== Dynamic results-by-objective (per-campaign objective mapping) =====
  const resultsByObjective: ResultByObjective[] = groupResultsByObjective(activeCampaigns);
  const primaryResult = resultsByObjective[0];
  const secondaryResults = resultsByObjective.slice(1);

  // Per-campaign breakdown (used in snapshot + reports)
  const campaignBreakdown = activeCampaigns.map(c => {
    const r = getObjectiveResult(c);
    const cpr = getCostPerResult(c);
    return {
      name: c.name,
      objective: c.objective,
      result_value: r.value,
      result_label: r.label,
      result_action_type: r.actionType,
      spend: c.spend,
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: c.ctr,
      cost_per_result: cpr,
    };
  });

  const reportData = {
    accountName: selectedAccountName,
    period: dateRange?.from && dateRange?.to
      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
      : '',
    totalSpend: metrics.spend,
    totalImpressions: metrics.impressions,
    totalClicks: metrics.clicks,
    totalConversions: dynamicTotalConversions,
    avgCTR: metrics.ctr,
    avgCPC: metrics.cpc,
    avgCPM: metrics.cpm,
    conversionLabel: currentActionLabel,
    resultsByObjective,
    campaignBreakdown,
  };

  if (loading && !hasInitialData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Carregando campanhas e métricas</h3>
            <p className="text-muted-foreground">
              {loadingProgress.step || 'Conectando com o Facebook...'}
            </p>
          </div>
          
          {/* Barra de Progresso */}
          <div className="w-64 mx-auto">
            <Progress 
              value={(loadingProgress.current / loadingProgress.total) * 100} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Etapa {loadingProgress.current} de {loadingProgress.total}
            </p>
          </div>
          
          {/* Dica de espera */}
          <p className="text-xs text-muted-foreground">
            Isso pode levar alguns segundos dependendo da quantidade de dados...
          </p>
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
          Atualizando campanhas...
        </div>
      )}

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

          <DateRangePicker 
            date={dateRange}
            onDateChange={setDateRange}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={() => fetchAllData()} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled={isGeneratingLink}
            onClick={async () => {
              if (!currentAgency?.id) {
                sonnerToast.error("Selecione uma agência primeiro.");
                return;
              }
              if (!selectedAccount) {
                sonnerToast.error("Selecione uma conta de anúncio antes de compartilhar.");
                return;
              }
              if (!dateRange?.from || !dateRange?.to) {
                sonnerToast.error("Selecione um período antes de compartilhar.");
                return;
              }
              setIsGeneratingLink(true);
              try {
                const accountName = selectedAdAccounts.find(a => a.ad_account_id === selectedAccount)?.ad_account_name || '';
                
                // Find a client matching the selected account name, or any active client
                let clientQuery = supabase
                  .from("clients")
                  .select("id")
                  .eq("agency_id", currentAgency.id)
                  .eq("active", true);

                // Try to match by name first
                const { data: matchedClients } = await clientQuery.ilike("name", `%${accountName}%`).limit(1);
                
                let clientId: string;
                if (matchedClients && matchedClients.length > 0) {
                  clientId = matchedClients[0].id;
                } else {
                  // Fallback: get any active client
                  const { data: anyClients, error: clientsError } = await supabase
                    .from("clients")
                    .select("id")
                    .eq("agency_id", currentAgency.id)
                    .eq("active", true)
                    .limit(1);

                  if (clientsError || !anyClients || anyClients.length === 0) {
                    sonnerToast.error("Nenhum cliente ativo encontrado. Cadastre um cliente primeiro.");
                    return;
                  }
                  clientId = anyClients[0].id;
                }

                const reportToken = crypto.randomUUID();
                const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
                const dateFrom = dateRange.from.toISOString().split('T')[0];
                const dateTo = dateRange.to.toISOString().split('T')[0];

                const snapshot = {
                  metrics: {
                    spend: metrics.spend,
                    impressions: metrics.impressions,
                    clicks: metrics.clicks,
                    conversions: dynamicTotalConversions,
                    cpm: metrics.cpm,
                    cpc: metrics.cpc,
                    ctr: metrics.ctr,
                  },
                  top_campaigns: campaigns
                    .sort((a, b) => b.spend - a.spend)
                    .slice(0, 5)
                    .map(c => ({
                      name: c.name,
                      objective: c.objective,
                      spend: c.spend,
                      conversions: computeConversionsForActions(c.actions, c.conversions),
                      impressions: c.impressions,
                      clicks: c.clicks,
                      ctr: c.ctr,
                    })),
                  chart_data: chartData,
                  active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
                  selectedActionType,
                  actionTypeLabel: currentActionLabel,
                };

                const { error: updateError } = await supabase
                  .from("clients")
                  .update({ 
                    report_token: reportToken, 
                    report_expires_at: expiresAt,
                    report_ad_account_id: selectedAccount,
                    report_date_from: dateFrom,
                    report_date_to: dateTo,
                    report_snapshot: snapshot as any,
                  })
                  .eq("id", clientId);

                if (updateError) {
                  sonnerToast.error("Erro ao gerar link. Tente novamente.");
                  return;
                }

                const url = `${window.location.origin}/report/${reportToken}`;
                await navigator.clipboard.writeText(url);
                sonnerToast.success(`Link gerado para "${accountName}"! Válido por 48h.`);
              } catch (err) {
                console.error("Erro ao gerar link:", err);
                sonnerToast.error("Erro ao gerar link.");
              } finally {
                setIsGeneratingLink(false);
              }
            }}
          >
            {isGeneratingLink ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Compartilhar
          </Button>
          <Button onClick={() => setIsReportModalOpen(true)} size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
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
            <div className="text-2xl font-bold">{formatCurrency(metrics.spend)}</div>
            <p className="text-xs text-muted-foreground">CPC: {formatCurrency(metrics.cpc)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.impressions)}</div>
            <p className="text-xs text-muted-foreground">CPM: {formatCurrency(metrics.cpm)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cliques</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.clicks)}</div>
            <p className="text-xs text-muted-foreground">CTR: {metrics.ctr.toFixed(2)}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm font-medium">{currentActionLabel}</CardTitle>
              <Popover open={actionSelectorOpen} onOpenChange={setActionSelectorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2 max-h-60 overflow-y-auto" align="start">
                  <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Selecionar métrica de conversão</p>
                  {sortedAvailableActions.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-2">Nenhuma ação disponível</p>
                  ) : (
                    sortedAvailableActions.map((action) => (
                      <button
                        key={action.action_type}
                        className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors ${
                          selectedActionType === action.action_type ? 'bg-muted font-medium' : ''
                        }`}
                        onClick={() => {
                          setSelectedActionType(action.action_type);
                          setActionSelectorOpen(false);
                        }}
                      >
                        <span className="truncate mr-2">{getActionTypeLabel(action.action_type)}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatNumber(action.value)}</span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dynamicTotalConversions)}</div>
            <p className="text-xs text-muted-foreground">
              Taxa: {((dynamicTotalConversions / metrics.clicks) * 100 || 0).toFixed(2)}%
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
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Gasto']} />
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
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatNumber(Number(value))]} />
                <Line type="monotone" dataKey="impressions" stroke="#82ca9d" name="Impressões" />
                <Line type="monotone" dataKey="clicks" stroke="#ffc658" name="Cliques" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Campanhas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Campanhas Ativas
              </CardTitle>
              <CardDescription>
                {activeCampaigns.length} campanha(s) ativa(s) no período selecionado
              </CardDescription>
            </div>
            <Badge variant="outline">{activeCampaigns.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {activeCampaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma campanha ativa encontrada para o período selecionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Última Alteração</TableHead>
                  <TableHead>Gasto</TableHead>
                  <TableHead>Cliques</TableHead>
                  <TableHead>{currentActionLabel}</TableHead>
                  <TableHead>CTR</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCampaigns.map((campaign) => (
                    <TableRow key={campaign.id} className={expandedCampaign === campaign.id ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium" title={campaign.name}>
                        {truncateText(campaign.name)}
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{getObjectiveLabel(campaign.objective)}</TableCell>
                      <TableCell>
                        {campaign.updated_time 
                          ? format(new Date(campaign.updated_time), 'dd/MM/yyyy', { locale: ptBR })
                          : 'N/A'
                        }
                      </TableCell>
                      <TableCell>{formatCurrency(campaign.spend)}</TableCell>
                      <TableCell>{formatNumber(campaign.clicks)}</TableCell>
                      <TableCell>{computeConversionsForActions(campaign.actions, campaign.conversions)}</TableCell>
                      <TableCell>{campaign.ctr.toFixed(2)}%</TableCell>
                      <TableCell>
                        <Button 
                          onClick={() => handleWeeklyAnalysis(campaign.id)}
                          variant={expandedCampaign === campaign.id ? "default" : "outline"}
                          size="sm"
                        >
                          <BarChart className="mr-1 h-3 w-3" />
                          Análise
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Expanded analysis - OUTSIDE the table for full width */}
          {expandedCampaign && (() => {
            const campaign = activeCampaigns.find(c => c.id === expandedCampaign);
            if (!campaign) return null;
            return (
              <div className="w-full border-t bg-muted/50 p-6">
                {loadingAnalysis ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Carregando análise de "{truncateText(campaign.name, 50)}"...</p>
                  </div>
                ) : weeklyAnalysis.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                    {/* Left: Weekly Cards */}
                    <div>
                      <h4 className="font-medium mb-3">Análise das Últimas 4 Semanas</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {weeklyAnalysis.map((week, index) => (
                          <Card key={index}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">{week.week}</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm space-y-1">
                              <p>Gasto: {formatCurrency(week.spend || 0)}</p>
                              <p>Conversões: {week.conversions || 0}</p>
                              <p>CPC: {formatCurrency(week.cpc || 0)}</p>
                              <p>CTR: {(week.ctr || 0).toFixed(2)}%</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Right: AI Analysis */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Análise da IA
                        </h4>
                        {aiAnalysis[campaign.id] && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(aiAnalysis[campaign.id])}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAIAnalysisWithData(campaign)}
                              disabled={aiAnalysisLoading === campaign.id}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Regenerar
                            </Button>
                          </div>
                        )}
                      </div>
                      {aiAnalysisLoading === campaign.id ? (
                        <div className="flex items-center justify-center py-8 border rounded-lg bg-background">
                          <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                          <span className="text-sm text-muted-foreground">Analisando com IA...</span>
                        </div>
                      ) : aiAnalysis[campaign.id] ? (
                        <div className="bg-background rounded-lg p-4 text-sm whitespace-pre-wrap border max-h-[400px] overflow-y-auto">
                          {aiAnalysis[campaign.id]}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 border rounded-lg bg-background text-sm text-muted-foreground">
                          Aguardando análise...
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum dado semanal disponível.</p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

        {/* Modal de Relatórios */}
        <ReportGeneratorModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportData={reportData}
          agencyId={currentAgency?.id}
        />
      </div>
    </>
  );
}