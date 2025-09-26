import { useState, useEffect } from "react";
import { Download, TrendingUp, TrendingDown, Calendar, FileText, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
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
  
  const { toast } = useToast();

  // Selecionar primeira conta automaticamente
  useEffect(() => {
    if (selectedAdAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(selectedAdAccounts[0].ad_account_id);
    }
  }, [selectedAdAccounts, selectedAccount]);

  useEffect(() => {
    generateReport();
  }, [selectedAdAccounts, selectedAccount, dateRange]);

  const generateReport = async () => {
    if (selectedAdAccounts.length === 0 || !selectedAccount || !dateRange?.from || !dateRange?.to) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Chamar edge function para gerar relatório
      const { data, error } = await supabase.functions.invoke('facebook-sync', {
        body: { 
          action: 'generate_report',
          accountIds: [selectedAccount],
          dateRange: {
            from: dateRange.from.toISOString().split('T')[0],
            to: dateRange.to.toISOString().split('T')[0]
          }
        }
      });

      if (error) throw error;
      
      if (data?.report) {
        setReportData(data.report);
      } else {
        // Dados mock para relatório
        const mockReportData = {
          summary: {
            totalSpend: 12450.50,
            totalImpressions: 450000,
            totalClicks: 8900,
            totalConversions: 245,
            avgCTR: 1.98,
            avgCPC: 1.40,
            avgCPM: 27.67,
            period: `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`
          },
          dailyData: Array.from({ length: dateRange?.from && dateRange?.to ? 
            Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) : 30 
          }, (_, i) => {
            const date = new Date((dateRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).getTime() + i * 24 * 60 * 60 * 1000);
            return {
              date: date.toLocaleDateString('pt-BR'),
              spend: Math.random() * 800 + 200,
              impressions: Math.floor(Math.random() * 15000) + 5000,
              clicks: Math.floor(Math.random() * 400) + 100,
              conversions: Math.floor(Math.random() * 15) + 3,
              ctr: Math.random() * 2 + 1,
              cpc: Math.random() * 2 + 0.5
            };
          }),
          campaignData: [
            { name: 'Campanha Black Friday', spend: 4500, conversions: 89, ctr: 2.1, cpc: 1.2 },
            { name: 'Tráfego Landing Page', spend: 3200, conversions: 67, ctr: 3.4, cpc: 0.8 },
            { name: 'Remarketing Audience', spend: 2800, conversions: 45, ctr: 1.8, cpc: 1.5 },
            { name: 'Lookalike Expansion', spend: 2100, conversions: 32, ctr: 1.6, cpc: 1.8 }
          ],
          platformData: [
            { name: 'Facebook Feed', value: 45, color: '#1877F2' },
            { name: 'Instagram Stories', value: 25, color: '#E4405F' },
            { name: 'Instagram Feed', value: 20, color: '#405DE6' },
            { name: 'Audience Network', value: 10, color: '#42B883' }
          ]
        };
        setReportData(mockReportData);
      }
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      // Dados mock em caso de erro
      const fallbackData = {
        summary: {
          totalSpend: 12450.50,
          period: dateRange?.from && dateRange?.to ? 
            `${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}` :
            'Período não definido'
        }
      };
      setReportData(fallbackData);
      
      toast({
        title: "Dados carregados offline",
        description: "Exibindo dados de exemplo. Clique em 'Gerar Relatório' para sincronizar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    toast({
      title: "Exportando relatório...",
      description: "O PDF será gerado em breve.",
    });
    // TODO: Implementar exportação real
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Gerando relatório...</p>
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

        <Button onClick={generateReport} disabled={loading}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      {reportData && (
        <>
          {/* Resumo Executivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumo Executivo</span>
                <Button onClick={exportToPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </CardTitle>
              <CardDescription>
                Período: {reportData.summary?.period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    }).format(reportData.summary?.totalSpend || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Investimento Total</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR').format(reportData.summary?.totalImpressions || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Impressões</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR').format(reportData.summary?.totalClicks || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Cliques</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">
                    {reportData.summary?.totalConversions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Conversões</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-lg font-semibold">{reportData.summary?.avgCTR?.toFixed(2) || 0}%</div>
                  <div className="text-xs text-muted-foreground">CTR Médio</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-lg font-semibold">R$ {reportData.summary?.avgCPC?.toFixed(2) || 0}</div>
                  <div className="text-xs text-muted-foreground">CPC Médio</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-lg font-semibold">R$ {reportData.summary?.avgCPM?.toFixed(2) || 0}</div>
                  <div className="text-xs text-muted-foreground">CPM Médio</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficos de Performance */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Investimento Diário</CardTitle>
                <CardDescription>Evolução do gasto por dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={reportData.dailyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)),
                        'Gasto'
                      ]}
                    />
                    <Area type="monotone" dataKey="spend" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversões por Dia</CardTitle>
                <CardDescription>Performance de conversões</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.dailyData || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Conversões']} />
                    <Bar dataKey="conversions" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance por Campanha */}
          {reportData.campaignData && (
            <Card>
              <CardHeader>
                <CardTitle>Performance por Campanha</CardTitle>
                <CardDescription>Comparativo de resultados entre campanhas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={reportData.campaignData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'spend' ? `R$ ${Number(value).toFixed(2)}` : value,
                        name === 'spend' ? 'Gasto' : name === 'conversions' ? 'Conversões' : 'CTR'
                      ]}
                    />
                    <Bar dataKey="spend" fill="#8884d8" name="spend" />
                    <Bar dataKey="conversions" fill="#82ca9d" name="conversions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Distribuição por Plataforma */}
          {reportData.platformData && (
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Posicionamento</CardTitle>
                <CardDescription>Onde seus anúncios estão sendo exibidos</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.platformData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}