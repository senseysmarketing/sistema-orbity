import { useState } from "react";
import { Copy, CheckCircle, Sparkles, Edit3, Info, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

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
}

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
}

export function ReportGeneratorModal({ isOpen, onClose, reportData }: ReportGeneratorModalProps) {
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const { toast } = useToast();

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

  const { accountName, period, totalSpend, totalImpressions, totalClicks, totalConversions, avgCTR, avgCPC, avgCPM } = reportData;

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
🎯 *CONVERSÕES:* ${totalConversions}

📈 *MÉTRICAS:*
• CTR: ${avgCTR.toFixed(2)}%
• CPC: ${formatCurrency(avgCPC)}
• CPM: ${formatCurrency(avgCPM)}

✨ Campanha otimizada e acompanhada diariamente!`
    },
    {
      title: "🎯 Foco em Resultados",
      category: "Conversões",
      message: `🎯 *RESULTADOS DO PERÍODO*

${totalConversions} conversões geradas! 🔥

💡 *Destaques:*
📍 Investimento de ${formatCurrency(totalSpend)}
📍 ${formatNumber(totalClicks)} cliques qualificados
📍 CTR de ${avgCTR.toFixed(2)}%

🚀 Vamos escalar as campanhas que estão performando melhor!

#TrafegoOtimizado #ResultadosReais`
    },
    {
      title: "💎 Premium",
      category: "Completo",
      message: `💎 *RELATÓRIO EXECUTIVO DE TRÁFEGO*

📊 *OVERVIEW - ${period}*
🏢 Conta: ${accountName}

💰 *FINANCEIRO:*
Total Investido: ${formatCurrency(totalSpend)}
CPC Médio: ${formatCurrency(avgCPC)}
CPM: ${formatCurrency(avgCPM)}

🎯 *PERFORMANCE:*
✨ ${formatNumber(totalImpressions)} impressões
🖱️ ${formatNumber(totalClicks)} cliques
🎯 ${totalConversions} conversões
📊 CTR: ${avgCTR.toFixed(2)}%

🚀 *Status:* Campanhas otimizadas!`
    },
    {
      title: "📱 Para Stories",
      category: "Social",
      message: `📊 RESULTADOS DO MÊS 📊

${totalConversions} CONVERSÕES! 🎯

💰 ${formatCurrency(totalSpend)} investidos
👥 ${formatNumber(totalImpressions)} pessoas alcançadas
🖱️ ${formatNumber(totalClicks)} cliques
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
    { key: 'totalConversions', value: totalConversions.toString(), description: 'Total de conversões' },
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

        <Tabs defaultValue="templates" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Personalizado</TabsTrigger>
            <TabsTrigger value="variables">Variáveis</TabsTrigger>
          </TabsList>

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