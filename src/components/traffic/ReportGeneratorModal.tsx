import { useState } from "react";
import { Copy, CheckCircle, Sparkles, Edit3, Info, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAIAssist } from "@/hooks/useAIAssist";

interface ResultByObjective {
  label: string;
  actionType: string;
  total: number;
  spend: number;
  costPerResult: number | null;
  campaignCount: number;
}

interface CampaignBreakdownItem {
  name: string;
  objective: string;
  result_value: number;
  result_label: string;
  result_action_type: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cost_per_result: number | null;
}

interface ReportData {
  accountName: string;
  period: string;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  conversionLabel?: string;
  resultsByObjective?: ResultByObjective[];
  campaignBreakdown?: CampaignBreakdownItem[];
}

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  agencyId?: string;
}

export function ReportGeneratorModal({ isOpen, onClose, reportData, agencyId }: ReportGeneratorModalProps) {
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const { toast } = useToast();
  const { generateReport } = useAIAssist();

  if (!reportData) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const copyToClipboard = async (text: string, templateIndex: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(templateIndex);
      toast({
        title: "✅ Copiado!",
        description: "Mensagem copiada para a área de transferência",
      });
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a mensagem",
        variant: "destructive"
      });
    }
  };

  const handleGenerateAI = async () => {
    setAiLoading(true);

    const fmtCpr = (v: number | null) =>
      v === null || !isFinite(v) || isNaN(v)
        ? '—'
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const objectivesBlock = reportData.resultsByObjective && reportData.resultsByObjective.length > 0
      ? reportData.resultsByObjective
          .map(r => `  - ${r.label}: ${r.total} (gasto: R$ ${r.spend.toFixed(2)}, custo/result.: ${fmtCpr(r.costPerResult)}, ${r.campaignCount} campanha(s))`)
          .join('\n')
      : '  (sem dados agrupados por objetivo)';

    const campaignsBlock = reportData.campaignBreakdown && reportData.campaignBreakdown.length > 0
      ? reportData.campaignBreakdown
          .map(c => `  - ${c.name} → R$ ${c.spend.toFixed(2)} | ${c.result_value} ${c.result_label} | CPR: ${fmtCpr(c.cost_per_result)} | CTR: ${c.ctr.toFixed(2)}%`)
          .join('\n')
      : '  (sem campanhas detalhadas)';

    const content = `Dados do período:
- Conta: ${reportData.accountName}
- Período: ${reportData.period}
- Investimento: R$ ${reportData.totalSpend.toFixed(2)}
- Impressões: ${reportData.totalImpressions}
- Cliques: ${reportData.totalClicks}
- CTR: ${reportData.avgCTR.toFixed(2)}%
- CPC: R$ ${reportData.avgCPC.toFixed(2)}
- CPM: R$ ${reportData.avgCPM.toFixed(2)}

Resultados por Objetivo:
${objectivesBlock}

Detalhamento por Campanha:
${campaignsBlock}

Gere um relatório que reflita as diferentes estratégias (cada campanha pode ter um objetivo diferente: leads, mensagens, cliques, etc.). Apresente os resultados de forma clara para o cliente final.`;

    const result = await generateReport(content, agencyId);
    if (result?.message) {
      setAiReport(result.message);
    }
    setAiLoading(false);
  };

  const { accountName, period, totalSpend, totalImpressions, totalClicks, totalConversions, avgCTR, avgCPC, avgCPM, conversionLabel, resultsByObjective, campaignBreakdown } = reportData;
  const convLabel = conversionLabel || 'Conversões';

  const fmtCpr = (v: number | null) =>
    v === null || !isFinite(v) || isNaN(v)
      ? '—'
      : formatCurrency(v);

  // Pre-built breakdown strings for templates
  const objectivesBreakdown = resultsByObjective && resultsByObjective.length > 0
    ? resultsByObjective.map(r => `• ${r.total} ${r.label} — ${formatCurrency(r.spend)} (CPR: ${fmtCpr(r.costPerResult)})`).join('\n')
    : `• ${totalConversions} ${convLabel}`;

  const campaignsBreakdownText = campaignBreakdown && campaignBreakdown.length > 0
    ? campaignBreakdown.map(c => `• ${c.name}\n  ↳ ${formatCurrency(c.spend)} → ${c.result_value} ${c.result_label} (CPR: ${fmtCpr(c.cost_per_result)})`).join('\n')
    : '';

  const templates = [
    {
      title: "📊 Relatório Geral",
      category: "Resumo",
      message: `🚀 *RELATÓRIO DE TRÁFEGO PAGO*

📅 *Período:* ${period}
🎯 *Conta:* ${accountName}

💰 *INVESTIMENTO:* ${formatCurrency(totalSpend)}
👁️ *IMPRESSÕES:* ${formatNumber(totalImpressions)}
🖱️ *CLIQUES:* ${formatNumber(totalClicks)}
📊 *CTR:* ${avgCTR.toFixed(2)}%

🎯 *RESULTADOS POR OBJETIVO:*
${objectivesBreakdown}

✨ Campanhas otimizadas e acompanhadas diariamente!`
    },
    {
      title: "🎯 Foco em Resultados",
      category: "Conversões",
      message: `🎯 *RESULTADOS DO PERÍODO*

${objectivesBreakdown}

💡 *Destaques:*
📍 Investimento total: ${formatCurrency(totalSpend)}
📍 ${formatNumber(totalClicks)} cliques qualificados
📍 CTR de ${avgCTR.toFixed(2)}%

🚀 Vamos escalar as campanhas que estão performando melhor!`
    },
    {
      title: "💎 Premium (Detalhado)",
      category: "Completo",
      message: `💎 *RELATÓRIO EXECUTIVO DE TRÁFEGO*

📊 *OVERVIEW — ${period}*
🏢 Conta: ${accountName}

💰 *FINANCEIRO:*
Total Investido: ${formatCurrency(totalSpend)}
CPC Médio: ${formatCurrency(avgCPC)}
CPM: ${formatCurrency(avgCPM)}

👁️ *ALCANCE:*
${formatNumber(totalImpressions)} impressões · ${formatNumber(totalClicks)} cliques · CTR ${avgCTR.toFixed(2)}%

🎯 *RESULTADOS POR OBJETIVO:*
${objectivesBreakdown}

📋 *DETALHAMENTO POR CAMPANHA:*
${campaignsBreakdownText || '(sem campanhas no período)'}

🚀 *Status:* Campanhas otimizadas!`
    },
    {
      title: "📱 Para Stories",
      category: "Social",
      message: `📊 RESULTADOS DO MÊS 📊

${objectivesBreakdown}

💰 ${formatCurrency(totalSpend)} investidos
👥 ${formatNumber(totalImpressions)} pessoas alcançadas
📈 ${avgCTR.toFixed(2)}% de CTR

Estratégia + Otimização = RESULTADOS! ✨`
    }
  ];

  const variables = [
    { key: 'accountName', value: accountName, description: 'Nome da conta' },
    { key: 'period', value: period, description: 'Período do relatório' },
    { key: 'totalSpend', value: formatCurrency(totalSpend), description: 'Investimento total' },
    { key: 'totalImpressions', value: formatNumber(totalImpressions), description: 'Total de impressões' },
    { key: 'totalClicks', value: formatNumber(totalClicks), description: 'Total de cliques' },
    { key: 'totalConversions', value: totalConversions.toString(), description: `Total de ${convLabel.toLowerCase()}` },
    { key: 'avgCTR', value: `${avgCTR.toFixed(2)}%`, description: 'CTR médio' },
    { key: 'avgCPC', value: formatCurrency(avgCPC), description: 'CPC médio' },
    { key: 'avgCPM', value: formatCurrency(avgCPM), description: 'CPM médio' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Gerador de Relatórios
          </DialogTitle>
          <DialogDescription>
            Gere mensagens profissionais com os dados do período selecionado
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai" className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Relatório IA
            </TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
            <TabsTrigger value="variables">Variáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Relatório Gerado por IA
                </CardTitle>
                <CardDescription>
                  A IA analisa os dados do período e gera uma mensagem completa com feedback e sugestões, pronta para enviar ao cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!aiReport && !aiLoading && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <Sparkles className="h-12 w-12 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground text-center max-w-md">
                      Clique no botão abaixo para gerar um relatório personalizado com análise de performance e sugestões de próximos passos
                    </p>
                    <Button onClick={handleGenerateAI} disabled={aiLoading}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar com IA
                    </Button>
                  </div>
                )}

                {aiLoading && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analisando dados e gerando relatório...</p>
                  </div>
                )}

                {aiReport && !aiLoading && (
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-4 rounded-lg max-h-80 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {aiReport}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => copyToClipboard(aiReport, -3)}
                        variant={copiedTemplate === -3 ? "default" : "outline"}
                      >
                        {copiedTemplate === -3 ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar
                          </>
                        )}
                      </Button>
                      <Button onClick={handleGenerateAI} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((template, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{template.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-xs font-mono">
                        {template.message}
                      </pre>
                    </div>
                    <Button 
                      onClick={() => copyToClipboard(template.message, index)}
                      className="w-full"
                      variant={copiedTemplate === index ? "default" : "outline"}
                      size="sm"
                    >
                      {copiedTemplate === index ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Mensagem Personalizada
                </CardTitle>
                <CardDescription>
                  Crie sua própria mensagem usando os dados disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Digite sua mensagem personalizada aqui..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => copyToClipboard(customMessage, -1)}
                    disabled={!customMessage.trim()}
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
          </TabsContent>

          <TabsContent value="variables" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Variáveis Disponíveis
                </CardTitle>
                <CardDescription>
                  Use estes valores para criar sua mensagem personalizada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {variables.map((variable) => (
                    <div 
                      key={variable.key}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{variable.description}</p>
                        <p className="text-xs text-muted-foreground">{variable.key}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {variable.value}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(variable.value, -2)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
