import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowDownCircle, CalendarClock, Repeat, CreditCard, TrendingUp, Pause, Play, Leaf, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CashFlowItem, CategoryTotal } from "@/hooks/useFinancialMetrics";

interface AdvancedExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  agencyId: string;
  selectedMonth: string;
  onEditExpense?: (expenseId: string) => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'PAID': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">Pago</Badge>;
    case 'OVERDUE': return <Badge variant="destructive">Atrasado</Badge>;
    case 'CANCELLED': return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Cancelado</Badge>;
    default: return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100">Pendente</Badge>;
  }
};

const currencyBadge = (currency: string | null) => {
  if (!currency || currency === 'BRL') return null;
  return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-[10px] px-1.5 py-0">{currency}</Badge>;
};

// ─── Anomaly Detection Component ───
function ExpenseAnomalyAlerts({ cashFlow, agencyId }: { cashFlow: CashFlowItem[]; agencyId: string }) {
  const expenseItems = useMemo(() =>
    cashFlow.filter(i => i.type === 'EXPENSE' && i.sourceType === 'expense' && i.status !== 'CANCELLED'),
    [cashFlow]
  );

  // Fetch master expenses with base_value for comparison
  const parentIds = useMemo(() => {
    const ids = new Set<string>();
    expenseItems.forEach(item => {
      if (item.id) ids.add(item.id);
    });
    return Array.from(ids);
  }, [expenseItems]);

  const { data: expenseDetails } = useQuery({
    queryKey: ['expense-anomaly-details', agencyId, parentIds],
    queryFn: async () => {
      if (parentIds.length === 0) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('id, name, amount, base_value, currency, exchange_rate, parent_expense_id')
        .in('id', parentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: parentIds.length > 0,
  });

  // Fetch last paid invoices for foreign currency comparisons
  const parentExpenseIds = useMemo(() => {
    if (!expenseDetails) return [];
    return expenseDetails
      .filter(e => e.parent_expense_id)
      .map(e => e.parent_expense_id!)
      .filter((v, i, a) => a.indexOf(v) === i);
  }, [expenseDetails]);

  const { data: lastPaidInvoices } = useQuery({
    queryKey: ['last-paid-invoices', parentExpenseIds],
    queryFn: async () => {
      if (parentExpenseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('id, amount, parent_expense_id, status, due_date')
        .in('parent_expense_id', parentExpenseIds)
        .eq('status', 'paid')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: parentExpenseIds.length > 0,
  });

  // Fetch master base_value/currency for foreign currency fallback
  const { data: masterExpenses } = useQuery({
    queryKey: ['master-expenses-for-anomaly', parentExpenseIds],
    queryFn: async () => {
      if (parentExpenseIds.length === 0) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('id, base_value, currency, exchange_rate')
        .in('id', parentExpenseIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: parentExpenseIds.length > 0,
  });

  const anomalies = useMemo(() => {
    if (!expenseDetails) return [];
    const alerts: { name: string; currentAmount: number; expectedAmount: number; diff: number; pct: number }[] = [];

    for (const exp of expenseDetails) {
      const currentAmount = exp.amount;
      const parentId = exp.parent_expense_id;
      const master = masterExpenses?.find(m => m.id === parentId);
      const currency = master?.currency || exp.currency || 'BRL';

      let threshold: number | null = null;

      if (currency !== 'BRL' && parentId) {
        // Blindagem 1: Compare with last paid invoice in BRL
        const lastPaid = lastPaidInvoices?.find(lp => lp.parent_expense_id === parentId && lp.id !== exp.id);
        if (lastPaid) {
          threshold = lastPaid.amount * 1.15;
        } else {
          // Fallback: base_value * exchange_rate * 1.15
          const bv = master?.base_value || exp.base_value;
          const er = master?.exchange_rate || exp.exchange_rate || 1;
          if (bv) threshold = bv * er * 1.15;
        }
      } else {
        // BRL: compare with base_value directly
        const bv = master?.base_value || exp.base_value;
        if (bv && bv > 0) {
          threshold = bv * 1.15;
        }
      }

      if (threshold && currentAmount > threshold) {
        const expectedAmount = threshold / 1.15;
        const diff = currentAmount - expectedAmount;
        const pct = Math.round(((currentAmount - expectedAmount) / expectedAmount) * 100);
        alerts.push({ name: exp.name, currentAmount, expectedAmount, diff, pct });
      }
    }
    return alerts;
  }, [expenseDetails, lastPaidInvoices, masterExpenses]);

  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-2">
      {anomalies.map((a, i) => (
        <Alert key={i} variant="destructive" className="border-destructive/50">
          <TrendingUp className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Atenção:</strong> A despesa <strong>{a.name}</strong> veio{' '}
            <strong>{formatCurrency(a.diff)}</strong> mais cara este mês (aumento de{' '}
            <strong>{a.pct}%</strong>). Verifique a fatura.
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

// ─── SaaS Tracker Subscription Card ───
function SubscriptionCard({ exp, onToggle, isToggling, onEdit }: {
  exp: any;
  onToggle: (id: string, newStatus: string) => void;
  isToggling: boolean;
  onEdit?: (id: string) => void;
}) {
  const isPaused = exp.subscription_status === 'paused';
  const isCanceled = exp.subscription_status === 'canceled';
  const isActive = !isPaused && !isCanceled;
  const baseValue = exp.base_value || exp.amount;
  const annualSavings = baseValue * 12;

  return (
    <Card className={`transition-all ${
      isCanceled ? 'opacity-40 border-dashed' :
      isPaused ? 'opacity-60 border-dashed border-muted-foreground/30' : ''
    }`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{exp.name}</p>
              {currencyBadge(exp.currency)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {exp.category && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{exp.category}</Badge>
              )}
              {exp.recurrence_day && (
                <span className="text-xs text-muted-foreground">Dia {exp.recurrence_day}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(exp.id)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {!isCanceled && (
              <>
                {isPaused ? <Pause className="h-3.5 w-3.5 text-muted-foreground" /> : <Play className="h-3.5 w-3.5 text-emerald-500" />}
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => onToggle(exp.id, checked ? 'active' : 'paused')}
                  disabled={isToggling}
                />
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className={`font-semibold text-sm ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`}>
            {formatCurrency(baseValue)}/mês
          </span>
          {isPaused && (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 text-[10px]">
              <Leaf className="h-3 w-3 mr-1" />
              Economia: {formatCurrency(annualSavings)}/ano
            </Badge>
          )}
          {isCanceled && (
            <Badge className="bg-muted text-muted-foreground text-[10px]">Cancelada</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Sheet Component ───
export function AdvancedExpenseSheet({ open, onOpenChange, cashFlow, agencyId, selectedMonth, onEditExpense }: AdvancedExpenseSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tab 1 data — from cashFlow
  const monthExpenses = useMemo(() =>
    cashFlow.filter(i => i.type === 'EXPENSE' && i.status !== 'CANCELLED'),
    [cashFlow]
  );

  const totalPending = useMemo(() => monthExpenses.filter(i => i.status !== 'PAID').reduce((s, i) => s + i.amount, 0), [monthExpenses]);
  const totalPaid = useMemo(() => monthExpenses.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amount, 0), [monthExpenses]);

  // Tab 2 — SaaS Tracker (all recurring, including paused)
  const { data: recurringExpenses, isLoading: loadingRecurring } = useQuery({
    queryKey: ['recurring-expenses-tracker', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, name, category, amount, recurrence_day, is_active, subscription_status, base_value, currency, exchange_rate')
        .eq('agency_id', agencyId)
        .eq('expense_type', 'recorrente')
        .is('parent_expense_id', null)
        .order('amount', { ascending: false });
      if (error) throw error;
      return (data ?? []).filter(e => e.subscription_status !== 'canceled' || e.is_active);
    },
    enabled: open,
  });

  const activeTotal = useMemo(() =>
    (recurringExpenses ?? []).filter(e => e.subscription_status === 'active').reduce((s, e) => s + (e.base_value || e.amount), 0),
    [recurringExpenses]
  );
  const pausedTotal = useMemo(() =>
    (recurringExpenses ?? []).filter(e => e.subscription_status === 'paused').reduce((s, e) => s + (e.base_value || e.amount), 0),
    [recurringExpenses]
  );

  // Kill Switch mutation (Blindagem 2)
  const toggleMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      // Update subscription status
      const { error } = await supabase
        .from('expenses')
        .update({ subscription_status: newStatus } as any)
        .eq('id', id);
      if (error) throw error;

      // Blindagem 2: If pausing, cancel pending child invoices
      if (newStatus === 'paused' || newStatus === 'canceled') {
        const { error: childError } = await supabase
          .from('expenses')
          .update({ status: 'cancelled' } as any)
          .eq('parent_expense_id', id)
          .eq('status', 'pending');
        if (childError) console.error('Erro ao cancelar pendentes:', childError);
      }
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses-tracker'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      toast({
        title: newStatus === 'paused' ? '⏸️ Assinatura pausada' : '▶️ Assinatura reativada',
        description: newStatus === 'paused'
          ? 'Faturas pendentes foram canceladas automaticamente.'
          : 'A assinatura voltará a gerar faturas no próximo ciclo.',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    },
  });

  // Tab 3 — installment master expenses (parent only)
  const { data: installmentExpenses, isLoading: loadingInstallments } = useQuery({
    queryKey: ['installment-expenses', agencyId],
    queryFn: async () => {
      // 1. Fetch only master records (parent_expense_id IS NULL)
      const { data: masters, error } = await supabase
        .from('expenses')
        .select('id, name, category, amount, installment_current, installment_total, due_date, status')
        .eq('agency_id', agencyId)
        .eq('expense_type', 'parcelada')
        .is('parent_expense_id', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      if (!masters || masters.length === 0) return [];

      // 2. For each master, count paid children to get real progress
      const masterIds = masters.map(m => m.id);
      const { data: children, error: childErr } = await supabase
        .from('expenses')
        .select('parent_expense_id, status')
        .in('parent_expense_id', masterIds);
      if (childErr) throw childErr;

      // Build a map: masterId -> { paid, total }
      const progressMap: Record<string, { paid: number; total: number }> = {};
      for (const child of (children ?? [])) {
        const pid = child.parent_expense_id!;
        if (!progressMap[pid]) progressMap[pid] = { paid: 0, total: 0 };
        progressMap[pid].total += 1;
        if (child.status === 'paid') progressMap[pid].paid += 1;
      }

      return masters.map(m => {
        const progress = progressMap[m.id];
        // If children exist, use child count; otherwise fallback to master fields
        const paidCount = progress ? progress.paid : (m.status === 'paid' ? 1 : 0);
        const totalCount = progress ? progress.total : (m.installment_total ?? 1);
        return { ...m, _paidCount: paidCount, _totalChildren: totalCount };
      }).filter(m => m._paidCount < m._totalChildren); // Only show with remaining installments
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
              SaaS Tracker
            </TabsTrigger>
            <TabsTrigger value="installments" className="flex-1">
              <CreditCard className="h-3.5 w-3.5 mr-1.5" />
              Parcelamentos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 — Month Expenses with Anomaly Alerts */}
          <TabsContent value="month" className="mt-4 space-y-4">
            <ExpenseAnomalyAlerts cashFlow={cashFlow} agencyId={agencyId} />

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
                    {onEditExpense && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={onEditExpense ? 5 : 4} className="text-center text-muted-foreground py-8">
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
                      {onEditExpense && item.sourceId && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditExpense(item.sourceId!)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Tab 2 — SaaS Tracker */}
          <TabsContent value="recurring" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Ativo/mês</span>
                  </div>
                  {loadingRecurring ? <Skeleton className="h-6 w-24" /> : (
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{formatCurrency(activeTotal)}</span>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">Economia/mês</span>
                  </div>
                  {loadingRecurring ? <Skeleton className="h-6 w-24" /> : (
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pausedTotal)}</span>
                  )}
                </CardContent>
              </Card>
            </div>

            {loadingRecurring ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : (recurringExpenses ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma assinatura cadastrada</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(recurringExpenses ?? []).map(exp => (
                  <SubscriptionCard
                    key={exp.id}
                    exp={exp}
                    onToggle={(id, newStatus) => toggleMutation.mutate({ id, newStatus })}
                    isToggling={toggleMutation.isPending}
                    onEdit={onEditExpense}
                  />
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
                const paid = exp._paidCount ?? 0;
                const total = exp._totalChildren ?? (exp.installment_total ?? 1);
                const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
                const totalValue = exp.amount * total;
                return (
                  <Card key={exp.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{exp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {paid} de {total} parcelas pagas
                            {exp.category && ` • ${exp.category}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {onEditExpense && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditExpense(exp.id)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <div className="text-right space-y-0.5">
                            <p className="font-semibold text-sm text-rose-600 dark:text-rose-400">{formatCurrency(exp.amount)}/parcela</p>
                            <p className="text-xs text-muted-foreground">Total: {formatCurrency(totalValue)}</p>
                          </div>
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
