import { useState, useEffect } from "react";
import { Copy, CheckCircle, Sparkles, TrendingUp, Calendar, RefreshCw, Edit3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface ReportsTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

export function ReportsTab({ selectedAdAccounts }: ReportsTabProps) {
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    to: new Date()
  });
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  
  const { toast } = useToast();

  // Selecionar primeira conta automaticamente
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(selectedAdAccounts[0].ad_account_id);
    }
  }, [selectedAdAccounts, selectedAccount]);

  useEffect(() => {
    if (selectedAdAccounts.length > 0 && selectedAccount && dateRange?.from && dateRange?.to) {
      generateReport();
    }
  }, [selectedAdAccounts, selectedAccount, dateRange]);

  const generateReport = async () => {
    if (selectedAdAccounts.length === 0 || !selectedAccount || !dateRange?.from || !dateRange?.to) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('facebook-sync', {
        body: { 
          action: 'get_metrics',
          accountIds: [selectedAccount],
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          }
        }
      });

      if (error) throw error;
      
      if (data?.metrics) {
        const metrics = data.metrics;
        setReportData({
          summary: {
            totalSpend: metrics.spend || 0,
            totalImpressions: metrics.impressions || 0,
            totalClicks: metrics.clicks || 0,
            totalConversions: metrics.conversions || 0,
            avgCTR: metrics.ctr || 0,
            avgCPC: metrics.cpc || 0,
            avgCPM: metrics.cpm || 0,
            period: `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`,
            accountName: selectedAdAccounts.find(acc => acc.ad_account_id === selectedAccount)?.ad_account_name || 'Conta Selecionada'
          }
        });
        
        toast({
          title: "✅ Dados carregados",
          description: "Relatório atualizado com dados reais do Facebook",
        });
      } else {
        throw new Error("Dados não encontrados na resposta");
      }
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      
      // Fallback com dados mock para demonstração
      const mockData = {
        summary: {
          totalSpend: 1250.50,
          totalImpressions: 45000,
          totalClicks: 890,
          totalConversions: 24,
          avgCTR: 1.98,
          avgCPC: 1.40,
          avgCPM: 27.67,
          period: `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`,
          accountName: selectedAdAccounts.find(acc => acc.ad_account_id === selectedAccount)?.ad_account_name || 'Conta Selecionada'
        }
      };
      setReportData(mockData);
      
      toast({
        title: "⚠️ Usando dados de exemplo",
        description: "Não foi possível carregar dados reais. Verifique a conexão com o Facebook.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, templateIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(templateIndex);
      toast({
        title: "✅ Copiado!",
        description: "Mensagem copiada para a área de transferência",
      });
      
      // Reset icon after 2 seconds
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const getMessageTemplates = () => {
    if (!reportData?.summary) return [];

    const { totalSpend, totalImpressions, totalClicks, totalConversions, avgCTR, avgCPC, period, accountName } = reportData.summary;

    return [
      {
        title: "📊 Relatório de Performance Geral",
        category: "Resumo Executivo",
        message: `🚀 *RELATÓRIO DE TRÁFEGO PAGO*

📅 *Período:* ${period}
🎯 *Conta:* ${accountName}

💰 *INVESTIMENTO:* ${formatCurrency(totalSpend)}
👁️ *IMPRESSÕES:* ${formatNumber(totalImpressions)}
🖱️ *CLIQUES:* ${formatNumber(totalClicks)}
🎯 *CONVERSÕES:* ${totalConversions}

📈 *MÉTRICAS PRINCIPAIS:*
• CTR: ${avgCTR?.toFixed(2)}%
• CPC: ${formatCurrency(avgCPC)}

✨ Campanha otimizada e acompanhada diariamente para máxima performance!`
      },
      {
        title: "🎯 Foco em Resultados",
        category: "Conversões",
        message: `🎯 *RESULTADOS DO PERÍODO*

${totalConversions} conversões geradas! 🔥

💡 *Destaques:*
📍 Investimento de ${formatCurrency(totalSpend)}
📍 ${formatNumber(totalClicks)} cliques qualificados
📍 CTR de ${avgCTR?.toFixed(2)}% (acima da média do mercado)

🚀 *Próximos passos:* Escalar as campanhas que estão performando melhor e otimizar as demais para aumentar ainda mais os resultados!

#TrafegoOtimizado #ResultadosReais`
      },
      {
        title: "📈 Análise de Crescimento",
        category: "Performance",
        message: `📊 *ANÁLISE DE PERFORMANCE - ${period}*

🔥 *INDICADORES PRINCIPAIS:*

💰 Investimento: ${formatCurrency(totalSpend)}
👥 Alcance: ${formatNumber(totalImpressions)} impressões
🎯 Engajamento: ${formatNumber(totalClicks)} cliques
✅ Conversões: ${totalConversions}

📈 *EFICIÊNCIA:*
• CPC: ${formatCurrency(avgCPC)}
• CTR: ${avgCTR?.toFixed(2)}%

🎯 Campanhas monitoradas 24/7 para garantir máximo ROI!`
      },
      {
        title: "💎 Relatório Premium",
        category: "Completo",
        message: `💎 *RELATÓRIO EXECUTIVO DE TRÁFEGO*

📊 *OVERVIEW - ${period}*
🏢 Conta: ${accountName}

💰 *FINANCEIRO:*
Total Investido: ${formatCurrency(totalSpend)}
CPC Médio: ${formatCurrency(avgCPC)}

🎯 *PERFORMANCE:*
✨ ${formatNumber(totalImpressions)} impressões
🖱️ ${formatNumber(totalClicks)} cliques
🎯 ${totalConversions} conversões
📊 CTR: ${avgCTR?.toFixed(2)}%

🚀 *Status:* Campanhas otimizadas e performando dentro do esperado!

#MarketingDigital #TrafegoOtimizado`
      },
      {
        title: "🔥 Relatório Motivacional",
        category: "Inspiracional",
        message: `🔥 *MAIS UM MÊS DE SUCESSO!*

🎉 Conseguimos ${totalConversions} conversões com um investimento estratégico de ${formatCurrency(totalSpend)}!

🚀 *O que conquistamos:*
• ${formatNumber(totalImpressions)} pessoas impactadas
• ${formatNumber(totalClicks)} interessados que clicaram
• CTR de ${avgCTR?.toFixed(2)}% (excelente performance!)
• CPC otimizado de ${formatCurrency(avgCPC)}

✨ A estratégia está funcionando perfeitamente! Vamos continuar escalando para resultados ainda maiores! 💪

#VamosQueVamos #ResultadosReais #SucessoColetivo`
      },
      {
        title: "📱 Para Stories/Social",
        category: "Redes Sociais",
        message: `📊 RESULTADOS DO MÊS 📊

${totalConversions} CONVERSÕES! 🎯

💰 ${formatCurrency(totalSpend)} investidos
👥 ${formatNumber(totalImpressions)} pessoas alcançadas
🖱️ ${formatNumber(totalClicks)} cliques
📈 ${avgCTR?.toFixed(2)}% de CTR

Estratégia + Otimização = RESULTADOS! ✨

#TrafegoOtimizado #MarketingDigital #Resultados`
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  const messageTemplates = getMessageTemplates();

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerador de Relatórios
          </CardTitle>
          <CardDescription>
            Gere mensagens profissionais com dados reais das suas campanhas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Selecionar conta de anúncios" />
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

            <Button onClick={generateReport} disabled={loading || !selectedAccount}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {loading ? "Carregando..." : "Carregar Dados"}
            </Button>
            
            <Button onClick={generateReport} disabled={loading || !selectedAccount} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Templates de Mensagens */}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Templates de Mensagens</h3>
              <Badge variant="outline">{messageTemplates.length} templates disponíveis</Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {messageTemplates.map((template, index) => (
                <Card key={index} className="relative group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{template.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                        {template.message}
                      </pre>
                    </div>
                    <Button 
                      onClick={() => copyToClipboard(template.message, index)}
                      className="w-full"
                      variant={copiedTemplate === index ? "default" : "outline"}
                    >
                      {copiedTemplate === index ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Mensagem
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Editor de Mensagem Personalizada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Mensagem Personalizada
              </CardTitle>
              <CardDescription>
                Crie sua própria mensagem usando os dados da campanha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Digite sua mensagem personalizada aqui... 

💡 Dica: Use os dados das métricas:
• Investimento: {formatCurrency(totalSpend)}
• Impressões: {formatNumber(totalImpressions)}
• Cliques: {formatNumber(totalClicks)}
• Conversões: {totalConversions}
• CTR: {avgCTR?.toFixed(2)}%
• CPC: {formatCurrency(avgCPC)}"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[150px] font-mono"
              />
              <div className="flex gap-2">
                <Button 
                  onClick={() => copyToClipboard(customMessage, -1)}
                  disabled={!customMessage.trim()}
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mensagem
                </Button>
                <Button 
                  onClick={() => setCustomMessage("")}
                  variant="outline"
                  disabled={!customMessage.trim()}
                >
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo dos Dados */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Dados da Campanha</CardTitle>
              <CardDescription>
                Métricas utilizadas nos templates • {reportData.summary?.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(reportData.summary?.totalSpend || 0)}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Investimento Total</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                  <div className="text-xl font-bold text-green-700 dark:text-green-300">
                    {formatNumber(reportData.summary?.totalImpressions || 0)}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Impressões</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                  <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                    {formatNumber(reportData.summary?.totalClicks || 0)}
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Cliques</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                  <div className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {reportData.summary?.totalConversions || 0}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">Conversões</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">{reportData.summary?.avgCTR?.toFixed(2) || 0}%</div>
                  <div className="text-xs text-muted-foreground">CTR Médio</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">{formatCurrency(reportData.summary?.avgCPC || 0)}</div>
                  <div className="text-xs text-muted-foreground">CPC Médio</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-lg font-semibold">{formatCurrency(reportData.summary?.avgCPM || 0)}</div>
                  <div className="text-xs text-muted-foreground">CPM Médio</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}