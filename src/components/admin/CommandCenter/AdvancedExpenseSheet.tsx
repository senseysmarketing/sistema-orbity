import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDownCircle, CalendarClock, Repeat, CreditCard, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CashFlowItem, CategoryTotal } from "@/hooks/useFinancialMetrics";

interface AdvancedExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  agencyId: string;
  selectedMonth: string;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'PAID': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">Pago</Badge>;
    case 'OVERDUE': return <Badge variant="destructive">Atrasado</Badge>;
    case 'CANCELLED': return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Cancelado</Badge>;
    default: return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100">Pendente</Badge>;
  }
};

export function AdvancedExpenseSheet({ open, onOpenChange, cashFlow, agencyId, selectedMonth }: AdvancedExpenseSheetProps) {
  // Tab 1 data — from cashFlow
  const monthExpenses = useMemo(() => {
    return cashFlow.filter(i => i.type === 'EXPENSE' && i.status !== 'CANCELLED');
  }, [cashFlow]);

  const totalPending = useMemo(() => monthExpenses.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.amount, 0), [monthExpenses]);
  const totalPaid = useMemo(() => monthExpenses.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0), [monthExpenses]);

  // Tab 2 — recurring expenses
  const { data: recurringExpenses, isLoading: loadingRecurring } = useQuery({
    queryKey: ['recurring-expenses', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, name, category, amount, recurrence_day, is_active')
        .eq('agency_id', agencyId)
        .eq('expense_type', 'recorrente')
        .eq('is_active', true)
        .order('amount', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const recurringTotal = useMemo(() => (recurringExpenses ?? []).reduce((s, e) => s + e.amount, 0), [recurringExpenses]);

  // Tab 3 — installment expenses
  const { data: installmentExpenses, isLoading: loadingInstallments } = useQuery({
    queryKey: ['installment-expenses', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, name, category, amount, installment_current, installment_total, due_date, status')
        .eq('agency_id', agencyId)
        .eq('expense_type', 'parcelada')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return (data ?? []).filter(e => (e.installment_current ?? 0) < (e.installment_total ?? 1));
    },
    enabled: open,
  });

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-[800px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-rose-500" />
            Central de Contas a Pagar
          </SheetTitle>
          <SheetDescription>Gestão completa de despesas — {monthLabel}</SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="month" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="month" className="flex-1">
              <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
              Contas do Mês
            </TabsTrigger>
            <TabsTrigger value="recurring" className="flex-1">
              <Repeat className="h-3.5 w-3.5 mr-1.5" />
              Assinaturas
            </TabsTrigger>
            <TabsTrigger value="installments" className="flex-1">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Parcelamentos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 — Month Expenses */}
          <TabsContent value="month" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Pendente</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPending)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Pago</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPaid)}</p>
                </CardContent>
              </Card>
            </div>

            <div className="max-h-[400px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma despesa no mês
                      </TableCell>
                    </TableRow>
                  ) : monthExpenses.map(item => (
                    <TableRow key={`${item.sourceType}-${item.id}`} className={item.status === 'OVERDUE' ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.title}</TableCell>
                      <TableCell className="text-right font-semibold text-sm text-rose-600 dark:text-rose-400">
                        {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tab 2 — Recurring / Subscriptions */}
          <TabsContent value="recurring" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Comprometido mensal fixo</span>
                </div>
                {loadingRecurring ? <Skeleton className="h-6 w-24" /> : (
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(recurringTotal)}</span>
                )}
              </CardContent>
            </Card>

            {loadingRecurring ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (recurringExpenses ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma assinatura ativa</p>
            ) : (
              <div className="space-y-2">
                {(recurringExpenses ?? []).map(exp => (
                  <Card key={exp.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{exp.name}</p>
                        <div className="flex items-center gap-2">
                          {exp.category && <Badge variant="outline" className="text-[10px] px-1 py-0">{exp.category}</Badge>}
                          {exp.recurrence_day && (
                            <span className="text-xs text-muted-foreground">Dia {exp.recurrence_day}</span>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(exp.amount)}/mês</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 3 — Installments */}
          <TabsContent value="installments" className="mt-4 space-y-3">
            {loadingInstallments ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : (installmentExpenses ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhum parcelamento ativo</p>
            ) : (
              (installmentExpenses ?? []).map(exp => {
                const current = exp.installment_current ?? 0;
                const total = exp.installment_total ?? 1;
                const pct = Math.round((current / total) * 100);
                return (
                  <Card key={exp.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Parcela {current} de {total}
                            {exp.category && ` • ${exp.category}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(exp.amount)}</p>
                          {statusBadge(exp.status)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}