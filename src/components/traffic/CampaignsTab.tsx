import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent } from '@radix-ui/react-collapsible';

interface Campaign {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
}

interface CampaignsTabProps {
  campaigns?: Campaign[];
  accounts?: any[];
  selectedAdAccounts?: any[];
}

export function CampaignsTab({ campaigns: propCampaigns = [], accounts = [], selectedAdAccounts = [] }: CampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(propCampaigns);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const { toast } = useToast();

  // Buscar campanhas quando o componente carregar
  useEffect(() => {
    if (selectedAdAccounts.length > 0) {
      fetchCampaigns();
    }
  }, [selectedAdAccounts]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const accountIds = selectedAdAccounts.map(acc => acc.ad_account_id);
      
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { 
          accounts: accountIds,
          date_range: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
          }
        }
      });

      if (error) throw error;

      setCampaigns(data?.campaigns || []);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as campanhas.",
        variant: "destructive",
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const truncateText = (text: string, limit: number = 35) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + '...';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { label: 'Ativo', variant: 'default' as const },
      PAUSED: { label: 'Pausado', variant: 'secondary' as const },
      DELETED: { label: 'Excluído', variant: 'destructive' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE;
    
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getObjectiveLabel = (objective: string) => {
    const objectives: { [key: string]: string } = {
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_APP_PROMOTION': 'App',
      'OUTCOME_AWARENESS': 'Reconhecimento',
      'OUTCOME_STORE_VISITS': 'Visitas à Loja'
    };
    
    return objectives[objective] || objective;
  };

  const handleWeeklyAnalysis = async (campaignId: string) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }

    setExpandedCampaign(campaignId);
    setLoadingAnalysis(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('facebook-analysis', {
        body: { 
          campaign_id: campaignId,
          accounts: selectedAdAccounts.map(acc => acc.ad_account_id)
        }
      });

      if (error) throw error;

      // Processar dados da análise semanal
      const processedData = data?.weekly_data?.map((week: any, index: number) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (index * 7) - 6);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - (index * 7));
        
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        };
        
        return {
          ...week,
          week: `Semana ${index + 1}`,
          weekPeriod: `${formatDate(weekStart)} a ${formatDate(weekEnd)}`
        };
      }) || [];

      setWeeklyAnalysis(processedData);
    } catch (error) {
      console.error('Erro ao carregar análise semanal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a análise semanal.",
        variant: "destructive",
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loadingCampaigns) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Carregando campanhas...</p>
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {selectedAdAccounts.length === 0 
            ? "Selecione uma conta de anúncios para ver as campanhas."
            : "Nenhuma campanha encontrada para as contas selecionadas."
          }
        </p>
        {selectedAdAccounts.length > 0 && (
          <Button onClick={fetchCampaigns} className="mt-4">
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeCampaigns.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR').format(activeCampaigns.reduce((sum, c) => sum + c.clicks, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              }).format(activeCampaigns.reduce((sum, c) => sum + c.spend, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversões Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeCampaigns.reduce((sum, c) => sum + c.conversions, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Campanhas */}
      <Card>
        <CardHeader>
          <CardTitle>Campanhas Ativas</CardTitle>
          <CardDescription>
            Gerencie e analise o desempenho das suas campanhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Gasto</TableHead>
                <TableHead>Impressões</TableHead>
                <TableHead>Cliques</TableHead>
                <TableHead>Conversões</TableHead>
                <TableHead>CTR</TableHead>
                <TableHead>CPC</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeCampaigns.map((campaign) => (
                <>
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium" title={campaign.name}>
                      {truncateText(campaign.name)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell>
                      {getObjectiveLabel(campaign.objective)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(campaign.spend)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR').format(campaign.impressions)}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR').format(campaign.clicks)}
                    </TableCell>
                    <TableCell>
                      {campaign.conversions}
                    </TableCell>
                    <TableCell>
                      {campaign.ctr.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      R$ {campaign.cpc.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleWeeklyAnalysis(campaign.id)}
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                        >
                          <BarChart className="mr-1 h-3 w-3" />
                          Análise 4 Semanas
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Análise semanal expandida */}
                  <Collapsible open={expandedCampaign === campaign.id}>
                    <CollapsibleContent asChild>
                      <TableRow>
                        <TableCell colSpan={10} className="p-0">
                          <div className="border-t bg-muted/50 p-4">
                            <h4 className="font-medium mb-3">Análise das Últimas 4 Semanas</h4>
                            {loadingAnalysis ? (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                              </div>
                            ) : weeklyAnalysis && weeklyAnalysis.length > 0 ? (
                              <div className="space-y-4">
                                <div className="flex flex-col xl:flex-row gap-6">
                                  <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {weeklyAnalysis.filter(week => week && typeof week === 'object').map((week, index) => {
                                        const prevWeek = weeklyAnalysis[index - 1];
                                        const getPercentageChange = (current: number, previous: number) => {
                                          if (!previous) return 0;
                                          return ((current - previous) / previous) * 100;
                                        };

                                        const spendChange = prevWeek && prevWeek.spend ? getPercentageChange(week.spend || 0, prevWeek.spend) : 0;
                                        const conversionsChange = prevWeek && prevWeek.conversions ? getPercentageChange(week.conversions || 0, prevWeek.conversions) : 0;
                                        const cpcChange = prevWeek && prevWeek.cpc ? getPercentageChange(week.cpc || 0, prevWeek.cpc) : 0;
                                        const ctrChange = prevWeek && prevWeek.ctr ? getPercentageChange(week.ctr || 0, prevWeek.ctr) : 0;

                                        return (
                                          <Card key={index} className="border">
                                            <CardHeader className="pb-2">
                                              <CardTitle className="text-xs sm:text-sm leading-tight">
                                                <div className="font-semibold">{week.week || `Semana ${index + 1}`}</div>
                                                <div className="text-xs text-muted-foreground font-normal">
                                                  {week.weekPeriod || 'Período não definido'}
                                                </div>
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                              <div className="text-xs sm:text-sm flex items-center justify-between">
                                                <span><span className="font-medium">Gasto:</span> R$ {(week.spend || 0).toFixed(2)}</span>
                                                {prevWeek && (
                                                  <span className={`text-xs ${spendChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {spendChange > 0 ? '+' : ''}{spendChange.toFixed(1)}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs sm:text-sm flex items-center justify-between">
                                                <span><span className="font-medium">Conversões:</span> {week.conversions || 0}</span>
                                                {prevWeek && (
                                                  <span className={`text-xs ${conversionsChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {conversionsChange > 0 ? '+' : ''}{conversionsChange.toFixed(1)}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs sm:text-sm flex items-center justify-between">
                                                <span><span className="font-medium">CPC:</span> R$ {(week.cpc || 0).toFixed(2)}</span>
                                                {prevWeek && (
                                                  <span className={`text-xs ${cpcChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {cpcChange > 0 ? '+' : ''}{cpcChange.toFixed(1)}%
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs sm:text-sm flex items-center justify-between">
                                                <span><span className="font-medium">CTR:</span> {(week.ctr || 0).toFixed(2)}%</span>
                                                {prevWeek && (
                                                  <span className={`text-xs ${ctrChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {ctrChange > 0 ? '+' : ''}{ctrChange.toFixed(1)}%
                                                  </span>
                                                )}
                                              </div>
                                            </CardContent>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  
                                  {/* Análise de Performance */}
                                  <div className="xl:w-80 xl:flex-shrink-0">
                                    <Card className="bg-muted/30">
                                      <CardHeader className="pb-3">
                                        <CardTitle className="text-sm">📊 Análise de Performance</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="text-xs sm:text-sm space-y-2">
                                          {(() => {
                                            if (!weeklyAnalysis || weeklyAnalysis.length === 0) {
                                              return <p>Não há dados suficientes para análise.</p>;
                                            }
                                            
                                            const validWeeks = weeklyAnalysis.filter(week => week && typeof week === 'object' && week.spend && week.conversions);
                                            
                                            if (validWeeks.length === 0) {
                                              return <p>Não há dados válidos para análise.</p>;
                                            }

                                            const bestWeek = validWeeks.reduce((best, current, index) => {
                                              const efficiency = current.conversions / current.spend;
                                              const bestEfficiency = validWeeks[best].conversions / validWeeks[best].spend;
                                              return efficiency > bestEfficiency ? index : best;
                                            }, 0);

                                            const worstWeek = validWeeks.reduce((worst, current, index) => {
                                              const efficiency = current.conversions / current.spend;
                                              const worstEfficiency = validWeeks[worst].conversions / validWeeks[worst].spend;
                                              return efficiency < worstEfficiency ? index : worst;
                                            }, 0);

                                            const totalSpend = validWeeks.reduce((sum, week) => sum + (week.spend || 0), 0);
                                            const totalConversions = validWeeks.reduce((sum, week) => sum + (week.conversions || 0), 0);
                                            const avgCPC = validWeeks.reduce((sum, week) => sum + (week.cpc || 0), 0) / validWeeks.length;

                                            return (
                                              <div className="space-y-3">
                                                <div>
                                                  <strong className="text-green-600">🏆 Melhor semana:</strong>
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    {validWeeks[bestWeek]?.week || `Semana ${bestWeek + 1}`} com {validWeeks[bestWeek]?.conversions || 0} conversões 
                                                    por R$ {(validWeeks[bestWeek]?.spend || 0).toFixed(2)}
                                                  </div>
                                                </div>
                                                <div>
                                                  <strong className="text-red-600">⚠️ Pior performance:</strong>
                                                  <div className="text-xs text-muted-foreground mt-1">
                                                    {validWeeks[worstWeek]?.week || `Semana ${worstWeek + 1}`} com maior custo por conversão 
                                                    (R$ {((validWeeks[worstWeek]?.spend || 0) / (validWeeks[worstWeek]?.conversions || 1)).toFixed(2)})
                                                  </div>
                                                </div>
                                                <div>
                                                  <strong className="text-blue-600">📈 Resumo:</strong>
                                                  <div className="text-xs text-muted-foreground mt-1 space-y-1">
                                                    <div>Total investido: R$ {totalSpend.toFixed(2)}</div>
                                                    <div>Total conversões: {totalConversions}</div>
                                                    <div>CPC médio: R$ {avgCPC.toFixed(2)}</div>
                                                    <div>Custo médio por conversão: R$ {totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00'}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-muted-foreground">Nenhum dado disponível para análise.</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ))}
            </TableBody>
          </Table>
          
          {activeCampaigns.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma campanha ativa encontrada para as contas selecionadas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}