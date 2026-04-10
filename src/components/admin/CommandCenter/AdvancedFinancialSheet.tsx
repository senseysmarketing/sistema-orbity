import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, AlertTriangle, Target, Bell } from "lucide-react";
import { BillingAutomationSettings } from "@/components/admin/BillingAutomationSettings";
import { formatCurrency } from "@/lib/utils";
import { useAdvancedAnalytics } from "@/hooks/useAdvancedAnalytics";
import type { CashFlowItem, CategoryTotal } from "@/hooks/useFinancialMetrics";

interface AdvancedFinancialSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  agencyId: string;
  selectedMonth: string;
}

export function AdvancedFinancialSheet({ open, onOpenChange, cashFlow, expensesByCategory, agencyId, selectedMonth }: AdvancedFinancialSheetProps) {
  const defaultYear = selectedMonth.split('-')[0];
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [billingRulerOpen, setBillingRulerOpen] = useState(false);

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[500px] overflow-y-auto">
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

        <div className="mt-6 space-y-6">
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

          {/* Billing Ruler trigger */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setBillingRulerOpen(true)}
          >
            <Bell className="h-4 w-4 mr-2" />
            Régua de Cobrança
          </Button>
        </div>

        <BillingAutomationSettings open={billingRulerOpen} onOpenChange={setBillingRulerOpen} />
      </SheetContent>
    </Sheet>
  );
}
