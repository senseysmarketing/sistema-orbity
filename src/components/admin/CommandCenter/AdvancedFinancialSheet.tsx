import { useState, useMemo, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, AlertTriangle,
  Target, Sparkles, ExternalLink, Loader2, CalendarClock, FileText, Copy, Printer,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import { useDREStatement } from "@/hooks/useDREStatement";
import { useDREHistory } from "@/hooks/useDREHistory";
import { validateDREPeriod, listDREMonths } from "@/lib/dre";
import { DREReportPdf } from "./DREReportPdf";
import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CashFlowItem, CategoryTotal, Client, ClientPayment, Employee, Expense,
} from "@/hooks/useFinancialMetrics";

interface AdvancedFinancialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  agencyId: string;
  agencyName?: string;
  selectedMonth: string;
  // Forecast data (optional — falls back to safe empty arrays)
  forecastClients?: Client[];
  forecastRecurringExpenses?: Expense[];
  employees?: Employee[];
  paymentsAll?: ClientPayment[];
  isForecastMode?: boolean;
  historicalCashFlow?: CashFlowItem[];
}

type RowStatus = "billed" | "pending";
interface ProjectionRow {
  client: Client;
  status: RowStatus;
  invoiceUrl?: string;
}

export function AdvancedFinancialSheet({
  open, onOpenChange, cashFlow, expensesByCategory, agencyId, agencyName, selectedMonth,
  forecastClients = [], forecastRecurringExpenses = [], employees = [],
  paymentsAll = [], isForecastMode = false, historicalCashFlow = [],
}: AdvancedFinancialSheetProps) {
  const defaultYear = selectedMonth.split('-')[0];
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [activeTab, setActiveTab] = useState<string>(isForecastMode ? "forecast" : "current");
  // O período do PDF é independente do mês global do Centro Financeiro.
  const today = new Date();
  const currentMonth = String(today.getFullYear()) + "-" + String(today.getMonth() + 1).padStart(2, "0");
  const initialReportMonth = selectedMonth > currentMonth ? currentMonth : selectedMonth;
  const [startMonth, setStartMonth] = useState(initialReportMonth);
  const [endMonth, setEndMonth] = useState(initialReportMonth);
  const [isExportingDRE, setIsExportingDRE] = useState(false);
  const [isBatching, setIsBatching] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentRealYear = new Date().getFullYear();
  const yearOptions = [currentRealYear - 2, currentRealYear - 1, currentRealYear].map(String);

  const analytics = useAdvancedAnalytics({ agencyId, selectedMonth, isOpen: open, selectedYear });

  // Block 1: Month X-Ray
  const totalExpected = cashFlow.filter(i => i.type === 'INCOME' && i.status !== 'CANCELLED').reduce((s, i) => s + i.amount, 0);
  const totalReceived = cashFlow.filter(i => i.type === 'INCOME' && i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = cashFlow.filter(i => i.type === 'INCOME' && i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0);
  const progressPct = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  // ============ FORECAST CALCULATIONS ============
  const totalActivePayroll = useMemo(
    () => employees.filter(e => e.is_active).reduce((s, e) => s + (e.base_salary || 0), 0),
    [employees]
  );
  const totalForecastMRR = useMemo(
    () => forecastClients.reduce((s, c) => s + (c.monthly_value || 0), 0),
    [forecastClients]
  );
  const totalForecastFixed = useMemo(
    () => forecastRecurringExpenses.reduce((s, e) => s + (e.amount || 0), 0),
    [forecastRecurringExpenses]
  );

  // ============ DRE STATEMENT ============
  const fallbackDRE = useDREStatement({
    cashFlow,
    isForecastMode,
    totalForecastMRR,
    totalActivePayroll,
    totalForecastFixed,
    historicalCashFlow,
  });

  useEffect(() => {
    if (!open) return;
    const month = selectedMonth > currentMonth ? currentMonth : selectedMonth;
    setStartMonth(month);
    setEndMonth(month);
  }, [open, selectedMonth, currentMonth]);

  const periodError = validateDREPeriod(startMonth, endMonth, currentMonth);
  const dreHistory = useDREHistory(agencyId, startMonth, endMonth, open && activeTab === "dre" && !periodError);
  const periodMonthCount = !periodError ? listDREMonths(startMonth, endMonth).length : 0;
  // Mesmo dataset usado pelo PDF, independentemente de cliente hoje inativo ou valor já recebido.
  const displayedHistory = useDREHistory(agencyId, selectedMonth, selectedMonth, open && activeTab === "dre" && !isForecastMode);
  const displayedReady = isForecastMode || (!!displayedHistory.data?.length && !displayedHistory.isError);
  const dre = !isForecastMode && displayedHistory.data?.[0]
    ? { ...displayedHistory.data[0].values, isProjectedTax: false }
    : fallbackDRE;

  const handleCopyDRE = async () => {
    const fmt = (v: number) => formatCurrency(v).padStart(16);
    const lines = [
      `📊 DRE — ${monthLabel}${isForecastMode ? ' (Projeção)' : ''}`,
      ``,
      `Receita Bruta:        ${fmt(dre.receitaBruta)}`,
      `(–) Impostos:         ${fmt(dre.impostos)}${dre.isProjectedTax ? ` (taxa ${(dre.effectiveTaxRate * 100).toFixed(1)}%)` : ''}`,
      `= Receita Líquida:    ${fmt(dre.receitaLiquida)}`,
      `(–) Custos Oper.:     ${fmt(dre.custosOper)}`,
      `(–) Folha Pgto:       ${fmt(dre.folhaPag)}`,
      `= Resultado Operacional: ${fmt(dre.ebitda)}`,
      `Margem Operacional:   ${dre.margemPct.toFixed(1)}%`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      toast({ title: "Resumo copiado", description: "Cole no WhatsApp ou e-mail." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleExportDRE = async () => {
    if (periodError || isExportingDRE) return;
    setIsExportingDRE(true);
    try {
      // Revalidar a consulta antes do download; nunca entregar arquivo parcial.
      const { data, error } = await dreHistory.refetch();
      if (error) throw error;
      if (!data || data.length !== periodMonthCount) throw new Error("Histórico incompleto. Tente novamente.");
      const issuedAt = new Date().toLocaleString("pt-BR");
      const blob = await pdf(
        <DREReportPdf agencyName={agencyName || "Agência"} months={data} currentMonth={currentMonth} issuedAt={issuedAt} />
      ).toBlob();
      if (!blob.size) throw new Error("Não foi possível gerar o arquivo PDF.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "DRE_Orbity_" + startMonth + "_a_" + endMonth + ".pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast({ title: "PDF gerado", description: periodMonthCount + " competência(s) exportada(s)." });
    } catch (err) {
      toast({ title: "Erro ao exportar DRE", description: err instanceof Error ? err.message : "Falha na exportação.", variant: "destructive" });
    } finally {
      setIsExportingDRE(false);
    }
  };

  // 90-day chart data: M+1, M+2, M+3 from current real month
  const chartData = useMemo(() => {
    const now = new Date();
    const arr: { month: string; Receita: number; Custo: number }[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      arr.push({
        month: label.charAt(0).toUpperCase() + label.slice(1).replace('.', ''),
        Receita: totalForecastMRR,
        Custo: totalActivePayroll + totalForecastFixed,
      });
    }
    return arr;
  }, [totalForecastMRR, totalActivePayroll, totalForecastFixed]);

  const projectedMargin = totalForecastMRR - (totalActivePayroll + totalForecastFixed);
  const marginIsPositive = projectedMargin >= 0;

  // Projection rows for the selected forecast month
  const projectionRows = useMemo<ProjectionRow[]>(() => {
    if (!isForecastMode || forecastClients.length === 0) return [];
    return forecastClients.map(client => {
      const existing = paymentsAll.find(p =>
        p.client_id === client.id &&
        p.due_date >= `${selectedMonth}-01` &&
        p.due_date <= `${selectedMonth}-31` &&
        p.status !== 'cancelled'
      );
      return {
        client,
        status: existing ? 'billed' as const : 'pending' as const,
        invoiceUrl: (existing as any)?.conexa_invoice_url || (existing as any)?.invoice_url || undefined,
      };
    });
  }, [forecastClients, paymentsAll, selectedMonth, isForecastMode]);

  const pendingRows = projectionRows.filter(r => r.status === 'pending');
  const totalProjectionMRR = projectionRows.reduce((s, r) => s + (r.client.monthly_value || 0), 0);

  // ============ BATCH BILLING ============
  const handleBatchBilling = async () => {
    if (pendingRows.length === 0) return;
    setIsBatching(true);
    setBatchProgress({ current: 0, total: pendingRows.length });

    const [yStr, mStr] = selectedMonth.split('-');
    const y = parseInt(yStr);
    const m = parseInt(mStr);
    const lastDay = new Date(y, m, 0).getDate();
    const monthStart = `${selectedMonth}-01`;
    const monthEnd = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < pendingRows.length; i++) {
      const { client } = pendingRows[i];
      setBatchProgress({ current: i + 1, total: pendingRows.length });
      try {
        // 1) Live anti-duplicate re-check (handles race with cron/webhooks)
        const { data: existing } = await supabase
          .from('client_payments')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('client_id', client.id)
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd)
          .neq('status', 'cancelled')
          .limit(1);

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        // 2) Compute due_date safely (cap to last day of month)
        const dueDay = Math.min(client.due_date || 1, lastDay);
        const dueDate = `${selectedMonth}-${String(dueDay).padStart(2, '0')}`;
        const billingType = client.default_billing_type || 'manual';

        const functionName = billingType === 'stripe' ? 'create-agency-stripe-charge' : 'create-gateway-charge';
        const { error: invokeError } = await supabase.functions.invoke(functionName, {
          body: {
            client_id: client.id,
            amount: client.monthly_value,
            due_date: dueDate,
            description: `Mensalidade ${monthLabel}`,
            billing_type: billingType,
            status: 'pending',
            agency_id: agencyId,
            auto_invoice: billingType !== 'manual',
          },
        });

        if (invokeError) {
          failed++;
          console.error('Batch billing failed for client', client.id, invokeError);
        } else {
          created++;
        }
      } catch (err) {
        failed++;
        console.error('Batch billing exception', err);
      }
    }

    setIsBatching(false);
    setBatchProgress({ current: 0, total: 0 });

    queryClient.invalidateQueries({ queryKey: ['admin-payments-all'] });

    toast({
      title: "Antecipação concluída",
      description: `${created} cobrança(s) criada(s), ${skipped} já existente(s) ignorada(s), ${failed} com erro.`,
      variant: failed > 0 && created === 0 ? "destructive" : "default",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[640px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise Avançada
            </SheetTitle>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SheetDescription>Visão estratégica de {monthLabel}</SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3 no-print">
            <TabsTrigger value="current">Visão Atual</TabsTrigger>
            <TabsTrigger value="forecast" className="gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              Projeção (90 dias)
            </TabsTrigger>
            <TabsTrigger value="dre" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              DRE / Contabilidade
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB A: CURRENT VIEW ============ */}
          <TabsContent value="current" className="space-y-6 mt-6">
            {/* Block 1: Raio-X do Mês */}
            <Card>
              <CardContent className="pt-5 px-5 space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Raio-X do Mês</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Recebido</span>
                    <span className="font-semibold">{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} className="h-2.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatCurrency(totalReceived)}</span>
                    {' '}recebidos de{' '}
                    <span className="font-semibold text-foreground">{formatCurrency(totalExpected)}</span>
                  </p>
                </div>

                {totalOverdue > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive font-semibold">
                      {formatCurrency(totalOverdue)} em atraso
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Block 2: Visão Anual YTD */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Visão Anual (YTD)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center space-y-1 min-w-0">
                    <DollarSign className="h-4 w-4 mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Faturamento Anual</p>
                    {analytics.isLoading ? <Skeleton className="h-5 w-20 mx-auto" /> : (
                      <p className="text-sm font-bold truncate">{formatCurrency(analytics.ytdRevenue)}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center space-y-1 min-w-0">
                    <Calendar className="h-4 w-4 mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Média Mensal</p>
                    {analytics.isLoading ? <Skeleton className="h-5 w-20 mx-auto" /> : (
                      <p className="text-sm font-bold truncate">{formatCurrency(analytics.monthlyAvg)}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center space-y-1 min-w-0">
                    {analytics.momGrowth >= 0 ? (
                      <TrendingUp className="h-4 w-4 mx-auto text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mx-auto text-rose-500" />
                    )}
                    <p className="text-xs text-muted-foreground">Crescimento MoM</p>
                    {analytics.isLoading ? <Skeleton className="h-5 w-12 mx-auto" /> : (
                      <Badge
                        className={analytics.momGrowth >= 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300 hover:bg-rose-100"
                        }
                      >
                        {analytics.momGrowth >= 0 ? '+' : ''}{analytics.momGrowth.toFixed(1)}%
                      </Badge>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center space-y-1 min-w-0">
                    <Target className="h-4 w-4 mx-auto text-primary" />
                    <p className="text-xs text-muted-foreground">Projeção Anual</p>
                    {analytics.isLoading ? <Skeleton className="h-5 w-20 mx-auto" /> : (
                      <p className="text-sm font-bold truncate">{formatCurrency(analytics.annualRunRate)}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Block 3: Top Categorias de Despesa */}
            {expensesByCategory.length > 0 && (
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Top Categorias de Despesa</h3>
                  {expensesByCategory.slice(0, 3).map((cat, i) => {
                    const maxVal = expensesByCategory[0].total;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            {cat.icon && <span className="text-xs">{cat.icon}</span>}
                            {cat.category}
                          </span>
                          <span className="font-semibold">{formatCurrency(cat.total)}</span>
                        </div>
                        <Progress value={(cat.total / maxVal) * 100} className="h-1.5" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB B: FORECAST 90 DAYS ============ */}
          <TabsContent value="forecast" className="space-y-6 mt-6">
            {/* B.1 Chart */}
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Próximos 90 Dias
                  </h3>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Receita" fill="#475569" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Custo" fill="#d4a574" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* B.2 Mini-cards */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4 text-center space-y-1 min-w-0">
                  <DollarSign className="h-4 w-4 mx-auto text-primary" />
                  <p className="text-xs text-muted-foreground">MRR Garantido</p>
                  <p className="text-sm font-bold truncate">{formatCurrency(totalForecastMRR)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center space-y-1 min-w-0">
                  <TrendingDown className="h-4 w-4 mx-auto text-amber-600" />
                  <p className="text-xs text-muted-foreground">Custos Fixos Previstos</p>
                  <p className="text-sm font-bold truncate">{formatCurrency(totalActivePayroll + totalForecastFixed)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center space-y-1 min-w-0">
                  {marginIsPositive ? (
                    <TrendingUp className="h-4 w-4 mx-auto text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mx-auto text-rose-500" />
                  )}
                  <p className="text-xs text-muted-foreground">Margem Projetada</p>
                  <p className={`text-sm font-bold truncate ${marginIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(projectedMargin)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* B.3 Projection table — only in forecast mode */}
            {isForecastMode && (
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Projeção de Cobranças — {monthLabel}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pendingRows.length} de {projectionRows.length} a faturar
                      </p>
                    </div>

                    {/* B.4 Batch billing button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          disabled={pendingRows.length === 0 || isBatching}
                          className="gap-1.5"
                        >
                          {isBatching ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Processando {batchProgress.current}/{batchProgress.total}...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Antecipar Faturamento ({pendingRows.length})
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Antecipar faturamento de {monthLabel}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vai criar <strong>{pendingRows.length} cobrança(s)</strong> no gateway para o mês de {monthLabel}.
                            Clientes que já possuem cobrança neste mês serão automaticamente ignorados.
                            Esta operação é segura e pode coexistir com a virada automática de mês.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBatchBilling}>
                            Sim, antecipar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  {projectionRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum cliente ativo com MRR configurado.
                    </p>
                  ) : (
                    <div className="rounded-md border max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Plano/Serviço</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projectionRows.map(row => (
                            <TableRow key={row.client.id}>
                              <TableCell className="font-medium truncate max-w-[150px]">{row.client.name}</TableCell>
                              <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {row.client.service || 'Mensalidade'}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">
                                {formatCurrency(row.client.monthly_value || 0)}
                              </TableCell>
                              <TableCell className="text-right">
                                {row.status === 'billed' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">
                                      Já Faturado
                                    </Badge>
                                    {row.invoiceUrl && (
                                      <a
                                        href={row.invoiceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                        title="Ver fatura"
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-muted/50">
                          <TableRow>
                            <TableCell colSpan={2} className="font-semibold">Total MRR Projetado</TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                              {formatCurrency(totalProjectionMRR)}
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {projectionRows.length} cliente(s)
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============ TAB C: DRE / CONTABILIDADE ============ */}
          <TabsContent value="dre" className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={!displayedReady} onClick={handleCopyDRE} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" />
                Copiar resumo do mês exibido
              </Button>
            </div>
            <div className="rounded-md border p-3 space-y-3">
              <p className="text-sm font-medium">Exportar DRE histórica (1 a 12 meses)</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Mês inicial
                  <Input aria-label="Mês inicial da DRE" type="month" max={currentMonth} value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Mês final
                  <Input aria-label="Mês final da DRE" type="month" max={currentMonth} value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
                </label>
              </div>
              {periodError ? (
                <p role="alert" className="text-xs text-destructive">{periodError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{periodMonthCount} competência(s) no PDF. O demonstrativo abaixo continua exibindo {monthLabel}.</p>
              )}
              {dreHistory.isError && !periodError && (
                <div className="flex items-center gap-2">
                  <p role="alert" className="text-xs text-destructive">Falha ao consultar dados históricos.</p>
                  <Button size="sm" variant="outline" onClick={() => dreHistory.refetch()}>Tentar novamente</Button>
                </div>
              )}
              <Button size="sm" onClick={handleExportDRE} disabled={!!periodError || dreHistory.isLoading || dreHistory.isFetching || dreHistory.isError || isExportingDRE} className="gap-1.5">
                {isExportingDRE ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                {isExportingDRE ? "Gerando PDF..." : dreHistory.isFetching ? "Carregando histórico..." : "Exportar PDF"}
              </Button>
            </div>

            {!displayedReady ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {displayedHistory.isError ? "Falha ao carregar a DRE do mês exibido." : "Carregando DRE do mês exibido..."}
                {displayedHistory.isError && <Button size="sm" variant="outline" onClick={() => displayedHistory.refetch()}>Tentar novamente</Button>}
              </div>
            ) : (
            <div>
              <div className="mb-4 space-y-1">
                <h2 className="text-lg font-semibold">DRE — {monthLabel}</h2>
                <p className="text-xs text-muted-foreground">
                  Demonstração gerencial do resultado
                  {isForecastMode && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Modo Projeção
                    </Badge>
                  )}
                </p>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Receita Bruta</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(dre.receitaBruta)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground">
                        (–) Impostos e Taxas
                        {dre.isProjectedTax && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">
                            Estimado · taxa histórica {(dre.effectiveTaxRate * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(dre.impostos)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-semibold">= Receita Líquida</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatCurrency(dre.receitaLiquida)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground">
                        (–) Custos Operacionais
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(dre.custosOper)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground">
                        (–) Folha de Pagamento
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatCurrency(dre.folhaPag)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-muted/30">
                      <TableCell className="font-semibold">
                        = Resultado operacional gerencial
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          dre.ebitda >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatCurrency(dre.ebitda)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Margem operacional</TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          dre.margemPct >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {dre.margemPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <p className="text-[10px] text-muted-foreground mt-3">
                Relatório gerencial: competência aproximada pelo vencimento; não substitui DRE contábil.
                Impostos são identificados por categorias tributárias (taxas operacionais não são consideradas tributos).
                {dre.isProjectedTax && ' A DRE exibida está em modo projeção; o PDF exporta apenas registros históricos. Impostos projetados usam a taxa histórica do mês anterior.'}
              </p>
            </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
