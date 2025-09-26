import { useState, useEffect } from "react";
import { Play, Pause, TrendingUp, TrendingDown, MoreVertical, Calendar, BarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";

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
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpm: number;
  cpc: number;
  ctr: number;
  account_id: string;
}

interface CampaignsTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function CampaignsTab({ selectedAdAccounts }: CampaignsTabProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [weeklyAnalysis, setWeeklyAnalysis] = useState<any[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    to: new Date()
  });
  
  const { toast } = useToast();

  // Selecionar primeira conta automaticamente
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(selectedAdAccounts[0].ad_account_id);
    }
  }, [selectedAdAccounts, selectedAccount]);

  useEffect(() => {
    fetchCampaigns();
  }, [selectedAdAccounts, selectedAccount, dateRange]);

  const fetchCampaigns = async () => {
    if (selectedAdAccounts.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Chamar edge function para buscar campanhas
      const { data, error } = await supabase.functions.invoke('facebook-campaigns', {
        body: { 
          action: 'list_campaigns',
          accountIds: selectedAccount ? [selectedAccount] : [],
          dateRange: dateRange?.from && dateRange?.to ? {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          } : undefined
        }
      });

      if (error) throw error;
      
      setCampaigns(data?.campaigns || []);
    } catch (error: any) {
      console.error('Erro ao buscar campanhas:', error);
      toast({
        title: "Erro ao carregar campanhas",
        description: "Não foi possível carregar as campanhas.",
        variant: "destructive",
      });
      // Mock data for development
      setCampaigns([
        {
          id: '1',
          name: 'Campanha de Conversão - Black Friday',
          status: 'ACTIVE',
          objective: 'CONVERSIONS',
          spend: 1250.50,
          impressions: 45000,
          clicks: 890,
          conversions: 45,
          cpm: 27.79,
          cpc: 1.40,
          ctr: 1.98,
          account_id: selectedAdAccounts[0]?.ad_account_id || ''
        },
        {
          id: '2',
          name: 'Tráfego para Landing Page',
          status: 'ACTIVE',
          objective: 'TRAFFIC',
          spend: 850.00,
          impressions: 32000,
          clicks: 1200,
          conversions: 28,
          cpm: 26.56,
          cpc: 0.71,
          ctr: 3.75,
          account_id: selectedAdAccounts[0]?.ad_account_id || ''
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyAnalysis = async (campaignId: string) => {
    setLoadingAnalysis(true);
    setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
    
    if (expandedCampaign !== campaignId) {
      try {
        // Chamar edge function para análise semanal
        const { data, error } = await supabase.functions.invoke('facebook-analysis', {
          body: { 
            action: 'weekly_analysis',
            campaignId: campaignId
          }
        });

        if (error) throw error;
        
        setWeeklyAnalysis(data?.analysis || []);
      } catch (error: any) {
        console.error('Erro ao buscar análise:', error);
        // Mock data for development - com datas das últimas 4 semanas
        const mockAnalysis = [];
        for (let i = 3; i >= 0; i--) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() - (i * 7));
          const startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 6);
          
          mockAnalysis.push({
            week: `Semana ${4 - i}`,
            weekPeriod: `${startDate.getDate().toString().padStart(2, '0')}/${(startDate.getMonth() + 1).toString().padStart(2, '0')} a ${endDate.getDate().toString().padStart(2, '0')}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`,
            spend: Math.random() * 500 + 200,
            conversions: Math.floor(Math.random() * 20) + 5,
            cpc: Math.random() * 2 + 1,
            ctr: Math.random() * 3 + 1,
            impressions: Math.floor(Math.random() * 10000) + 5000,
            clicks: Math.floor(Math.random() * 500) + 100,
            cpm: Math.random() * 30 + 20
          });
        }
        setWeeklyAnalysis(mockAnalysis);
      }
    }
    
    setLoadingAnalysis(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Finalizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getObjectiveLabel = (objective: string) => {
    const objectives: { [key: string]: string } = {
      'CONVERSIONS': 'Conversões',
      'TRAFFIC': 'Tráfego',
      'AWARENESS': 'Reconhecimento',
      'ENGAGEMENT': 'Engajamento',
      'APP_INSTALLS': 'Instalações',
      'LEAD_GENERATION': 'Geração de Leads'
    };
    return objectives[objective] || objective;
  };

  const truncateText = (text: string, maxLength: number = 35) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
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

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {campaigns.filter(c => c.status === 'ACTIVE').length}
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
              }).format(campaigns.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + c.spend, 0))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversões Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'ACTIVE').reduce((sum, c) => sum + c.conversions, 0)}
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
            {campaigns.filter(campaign => campaign.status === 'ACTIVE').map((campaign) => (
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
          
          {campaigns.filter(c => c.status === 'ACTIVE').length === 0 && (
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