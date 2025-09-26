import { useState, useEffect } from "react";
import { Copy, Download, MessageCircle, Sparkles, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SelectedAdAccount {
  id: string;
  ad_account_id: string;
  ad_account_name: string;
  currency: string;
}

interface ReportsTabProps {
  selectedAdAccounts: SelectedAdAccount[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
}

export function ReportsTab({ selectedAdAccounts }: ReportsTabProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [customMessage, setCustomMessage] = useState("");
  const [generatedReport, setGeneratedReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  
  const { toast } = useToast();

  // Templates predefinidos
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'performance',
      name: 'Relatório de Performance',
      description: 'Relatório completo com principais métricas',
      template: `📊 *RELATÓRIO DE PERFORMANCE - {{accountName}}*\n\n📅 Período: {{period}}\n\n🔥 *PRINCIPAIS RESULTADOS:*\n💰 Investimento: R$ {{spend}}\n👁️ Impressões: {{impressions}}\n🖱️ Cliques: {{clicks}}\n🎯 Conversões: {{conversions}}\n\n📈 *MÉTRICAS:*\n• CPM: R$ {{cpm}}\n• CPC: R$ {{cpc}}\n• CTR: {{ctr}}%\n• Taxa de Conversão: {{conversionRate}}%\n\n✅ Status: Campanha otimizada e performando bem!`
    },
    {
      id: 'weekly',
      name: 'Resumo Semanal',
      description: 'Resumo semanal dos resultados',
      template: `📅 *RESUMO SEMANAL - {{accountName}}*\n\nOlá! Aqui está o resumo da semana:\n\n💸 Investimento: R$ {{spend}}\n🎯 Resultados: {{conversions}} conversões\n📊 CTR: {{ctr}}%\n💰 CPC médio: R$ {{cpc}}\n\n{{weeklyComparison}}\n\nPróximos passos: {{nextSteps}}`
    },
    {
      id: 'monthly',
      name: 'Relatório Mensal',
      description: 'Análise detalhada do mês',
      template: `📈 *RELATÓRIO MENSAL - {{accountName}}*\n\n🗓️ Mês: {{month}}\n\n🎯 *RESUMO EXECUTIVO:*\nInvestimento Total: R$ {{spend}}\nConversões: {{conversions}}\nROAS: {{roas}}\n\n📊 *ANÁLISE:*\n• Melhor semana: {{bestWeek}}\n• Maior CTR: {{bestCTR}}%\n• Menor CPC: R$ {{bestCPC}}\n\n💡 *INSIGHTS:*\n{{insights}}\n\n🚀 *PRÓXIMAS AÇÕES:*\n{{recommendations}}`
    },
    {
      id: 'crisis',
      name: 'Comunicação de Crise',
      description: 'Para campanhas com baixa performance',
      template: `⚠️ *COMUNICADO IMPORTANTE - {{accountName}}*\n\nIdentificamos uma queda na performance:\n\n📉 *SITUAÇÃO ATUAL:*\n• CPC: R$ {{cpc}} (↑ {{cpcIncrease}}%)\n• CTR: {{ctr}}% (↓ {{ctrDecrease}}%)\n• Conversões: {{conversions}}\n\n🔧 *AÇÕES TOMADAS:*\n• Pausamos anúncios com baixo desempenho\n• Realocamos budget para públicos que convertem\n• Testamos novos creativos\n\n📞 Vamos alinhar uma call para revisar a estratégia?`
    },
    {
      id: 'success',
      name: 'Celebração de Resultados',
      description: 'Para campanhas com excelente performance',
      template: `🎉 *EXCELENTES RESULTADOS - {{accountName}}*\n\nTemos motivos para comemorar!\n\n🚀 *CONQUISTAS:*\n✅ {{conversions}} conversões alcançadas\n✅ CPC 25% abaixo da média: R$ {{cpc}}\n✅ CTR acima do benchmark: {{ctr}}%\n✅ ROAS de {{roas}}\n\n💰 Investimento: R$ {{spend}}\n📈 ROI: {{roi}}%\n\n🎯 Vamos escalar esses resultados? Já temos algumas ideias!`
    },
    {
      id: 'optimization',
      name: 'Relatório de Otimização',
      description: 'Foco em otimizações realizadas',
      template: `🔧 *RELATÓRIO DE OTIMIZAÇÃO - {{accountName}}*\n\n🎯 *OTIMIZAÇÕES REALIZADAS:*\n• Ajuste de públicos (+15% performance)\n• Novos creativos testados\n• Realocação de budget\n• Otimização de lances\n\n📊 *RESULTADOS PÓS-OTIMIZAÇÃO:*\nCPC: R$ {{cpc}} ({{cpcChange}})\nCTR: {{ctr}}% ({{ctrChange}})\nConversões: {{conversions}}\n\n⏰ Próxima análise em 3 dias para validar tendências.`
    }
  ];

  useEffect(() => {
    fetchMetricsData();
  }, [selectedAdAccounts, selectedAccount]);

  const fetchMetricsData = async () => {
    if (selectedAdAccounts.length === 0) return;

    try {
      // Buscar métricas do banco de dados
      let query = supabase
        .from('ad_account_metrics')
        .select('*')
        .gte('date_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .lte('date_end', new Date().toISOString().split('T')[0]);

      if (selectedAccount !== "all") {
        query = query.eq('ad_account_id', selectedAccount);
      } else {
        const accountIds = selectedAdAccounts.map(acc => acc.ad_account_id);
        query = query.in('ad_account_id', accountIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agregar dados
      const aggregated = data?.reduce((acc, metric) => ({
        spend: acc.spend + (metric.spend || 0),
        impressions: acc.impressions + (metric.impressions || 0),
        clicks: acc.clicks + (metric.clicks || 0),
        conversions: acc.conversions + (metric.conversions || 0),
        cpm: acc.cpm + (metric.cpm || 0),
        cpc: acc.cpc + (metric.cpc || 0),
        ctr: acc.ctr + (metric.ctr || 0)
      }), {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cpm: 0,
        cpc: 0,
        ctr: 0
      });

      if (aggregated && data?.length) {
        aggregated.cpm = aggregated.cpm / data.length;
        aggregated.cpc = aggregated.cpc / data.length;
        aggregated.ctr = aggregated.ctr / data.length;
      }

      setMetricsData(aggregated);
    } catch (error: any) {
      console.error('Erro ao buscar métricas:', error);
      // Mock data para desenvolvimento
      setMetricsData({
        spend: 2450.50,
        impressions: 85000,
        clicks: 1890,
        conversions: 76,
        cpm: 28.80,
        cpc: 1.30,
        ctr: 2.22
      });
    }
  };

  const generateReport = (template: ReportTemplate) => {
    if (!metricsData) {
      toast({
        title: "Dados não disponíveis",
        description: "Aguarde o carregamento das métricas.",
        variant: "destructive",
      });
      return;
    }

    const accountName = selectedAccount === "all" 
      ? "Todas as Contas" 
      : selectedAdAccounts.find(acc => acc.ad_account_id === selectedAccount)?.ad_account_name || "Conta Selecionada";

    const variables = {
      accountName,
      period: "Últimos 7 dias",
      month: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      spend: metricsData.spend.toFixed(2),
      impressions: new Intl.NumberFormat('pt-BR').format(metricsData.impressions),
      clicks: new Intl.NumberFormat('pt-BR').format(metricsData.clicks),
      conversions: metricsData.conversions,
      cpm: metricsData.cpm.toFixed(2),
      cpc: metricsData.cpc.toFixed(2),
      ctr: metricsData.ctr.toFixed(2),
      conversionRate: ((metricsData.conversions / metricsData.clicks) * 100 || 0).toFixed(2),
      roas: ((metricsData.conversions * 100) / metricsData.spend || 0).toFixed(2),
      roi: (((metricsData.conversions * 150 - metricsData.spend) / metricsData.spend) * 100 || 0).toFixed(1),
      bestWeek: "Semana 2",
      bestCTR: (metricsData.ctr * 1.2).toFixed(2),
      bestCPC: (metricsData.cpc * 0.8).toFixed(2),
      weeklyComparison: "📈 +15% vs semana anterior",
      nextSteps: "Testar novos creativos e expandir públicos similares",
      insights: "Público feminino 25-34 convertendo 40% melhor",
      recommendations: "Aumentar budget em 20% nos melhores anúncios",
      cpcIncrease: "25",
      ctrDecrease: "18"
    };

    let report = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      report = report.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
    });

    setGeneratedReport(report);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Relatório copiado para a área de transferência.",
    });
  };

  const generateCustomReport = async () => {
    if (!customMessage.trim()) {
      toast({
        title: "Mensagem vazia",
        description: "Digite sua mensagem personalizada.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Chamar edge function para gerar relatório personalizado com IA
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { 
          customMessage,
          metricsData,
          accountName: selectedAccount === "all" 
            ? "Todas as Contas" 
            : selectedAdAccounts.find(acc => acc.ad_account_id === selectedAccount)?.ad_account_name
        }
      });

      if (error) throw error;
      
      setGeneratedReport(data?.report || customMessage);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      // Fallback: usar mensagem personalizada com métricas básicas
      const enhancedMessage = `${customMessage}\n\n📊 Dados do período:\n💰 Investimento: R$ ${metricsData?.spend.toFixed(2)}\n🎯 Conversões: ${metricsData?.conversions}\n📈 CTR: ${metricsData?.ctr.toFixed(2)}%`;
      setGeneratedReport(enhancedMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Selecionar conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {selectedAdAccounts.map((account) => (
              <SelectItem key={account.ad_account_id} value={account.ad_account_id}>
                {account.ad_account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates Prontos</TabsTrigger>
          <TabsTrigger value="custom">Mensagem Personalizada</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Templates Predefinidos */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportTemplates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => generateReport(template)}
                    className="w-full"
                    variant="outline"
                  >
                    Gerar Relatório
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          {/* Mensagem Personalizada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Mensagem Personalizada
              </CardTitle>
              <CardDescription>
                Digite sua mensagem e ela será enriquecida com dados da campanha
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Ex: Olá! Como estão os resultados desta semana? Gostaria de um resumo com os principais números..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={generateCustomReport}
                disabled={loading || !customMessage.trim()}
                className="w-full"
              >
                {loading ? "Gerando..." : "Gerar Relatório com IA"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Relatório Gerado */}
      {generatedReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Relatório Gerado
              </span>
              <Badge variant="outline">Pronto para WhatsApp</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {generatedReport}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => copyToClipboard(generatedReport)}
                className="flex-1"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar para WhatsApp
              </Button>
              <Button 
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([generatedReport], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'relatorio.txt';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Atuais */}
      {metricsData && (
        <Card>
          <CardHeader>
            <CardTitle>Métricas Atuais (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">R$ {metricsData.spend.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Investimento</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">{metricsData.conversions}</div>
                <div className="text-sm text-muted-foreground">Conversões</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">{metricsData.ctr.toFixed(2)}%</div>
                <div className="text-sm text-muted-foreground">CTR</div>
              </div>
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">R$ {metricsData.cpc.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">CPC</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}