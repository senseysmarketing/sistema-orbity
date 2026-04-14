import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowDownCircle, ArrowUpCircle, Filter, MoreHorizontal, Pencil, Ban, Search, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { MarkAsPaidPopover } from "./MarkAsPaidPopover";
import { AdvancedFinancialSheet } from "./AdvancedFinancialSheet";
import { AdvancedExpenseSheet } from "./AdvancedExpenseSheet";
import type { CashFlowItem, CategoryTotal } from "@/hooks/useFinancialMetrics";

type FilterType = 'all' | 'next7' | 'overdue';

interface CashFlowTableProps {
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  onMarkAsPaid: (params: { id: string; sourceType: string; paidDate: string; paidAmount: number }) => void;
  isMarkingAsPaid: boolean;
  onEditItem?: (item: CashFlowItem) => void;
  onCancelItem?: (params: { id: string; sourceType: string }) => void;
  isCancellingItem?: boolean;
  agencyId: string;
  selectedMonth: string;
  className?: string;
  onEditExpenseById?: (expenseId: string) => void;
}

export function CashFlowTable({ cashFlow, expensesByCategory, onMarkAsPaid, isMarkingAsPaid, onEditItem, onCancelItem, isCancellingItem, agencyId, selectedMonth, className, onEditExpenseById }: CashFlowTableProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancelDialogItem, setCancelDialogItem] = useState<CashFlowItem | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);

    return cashFlow.filter(item => {
      if (filter === 'overdue') {
        const todayStr = new Date().toISOString().split('T')[0];
        return item.status === 'OVERDUE' || (item.status === 'PENDING' && item.dueDate < todayStr);
      }
      if (filter === 'next7') {
        const d = new Date(item.dueDate);
        return d >= today && d <= in7Days && item.status !== 'PAID' && item.status !== 'CANCELLED';
      }
      return true;
    }).filter(item => {
      if (!searchTerm.trim()) return true;
      return item.title.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [cashFlow, filter, searchTerm]);

  const totalExpenses = expensesByCategory.reduce((s, c) => s + c.total, 0) || 1;
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = cashFlow.filter(i => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueDate < todayStr)).length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">Pago</Badge>;
      case 'OVERDUE': return <Badge variant="destructive">Atrasado</Badge>;
      case 'CANCELLED': return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Cancelado</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100">Pendente</Badge>;
    }
  };

  const handleConfirmCancel = () => {
    if (cancelDialogItem && onCancelItem) {
      onCancelItem({ id: cancelDialogItem.sourceId, sourceType: cancelDialogItem.sourceType });
    }
    setCancelDialogItem(null);
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Fluxo de Caixa
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
                Este Mês
              </Button>
              <Button variant={filter === 'next7' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('next7')}>
                Próx. 7 dias
              </Button>
              <Button
                variant={filter === 'overdue' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilter('overdue')}
              >
                Atrasados {overdueCount > 0 && `(${overdueCount})`}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAdvancedOpen(true)}>
                <BarChart3 className="h-4 w-4 mr-1" />
                Análise Avançada
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(item => {
                    const isCancelled = item.status === 'CANCELLED';
                    return (
                    <TableRow key={`${item.sourceType}-${item.id}`} className={`${item.status === 'OVERDUE' ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''} ${isCancelled ? 'opacity-50' : ''}`}>
                      <TableCell className="pr-0">
                        {item.type === 'INCOME' ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-1.5">
                          {item.title}
                          {item.type === 'INCOME' && item.billingType && item.billingType !== 'manual' && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                              {item.billingType === 'asaas' ? 'Asaas' : 'Conexa'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${isCancelled ? 'line-through text-muted-foreground' : item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.status !== 'PAID' && item.status !== 'CANCELLED' && (
                            <MarkAsPaidPopover
                              originalAmount={item.amount}
                              isLoading={isMarkingAsPaid}
                              onConfirm={(paidDate, paidAmount) => {
                                onMarkAsPaid({ id: item.sourceId, sourceType: item.sourceType, paidDate, paidAmount });
                              }}
                            />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEditItem && (
                                <DropdownMenuItem onClick={() => onEditItem(item)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar Detalhes
                                </DropdownMenuItem>
                              )}
                              {item.status !== 'PAID' && item.status !== 'CANCELLED' && onCancelItem && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setCancelDialogItem(item)}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancelar / Perdoar
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Top Categorias de Custo */}
      {expensesByCategory.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Categorias de Custo</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setExpenseSheetOpen(true)}>
                Central de Despesas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {expensesByCategory.slice(0, 5).map((cat, i) => {
              const pct = Math.round((cat.total / totalExpenses) * 100);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5">
                      {cat.icon && <span className="text-xs">{cat.icon}</span>}
                      {cat.category}
                      <span className="text-muted-foreground">({formatCurrency(cat.total)})</span>
                    </span>
                    <span className="font-semibold text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelDialogItem} onOpenChange={(open) => { if (!open) setCancelDialogItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar / Perdoar Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar "{cancelDialogItem?.title}"? O item será removido do fluxo de caixa mas mantido no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isCancellingItem}
            >
              {isCancellingItem ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdvancedFinancialSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        cashFlow={cashFlow}
        expensesByCategory={expensesByCategory}
        agencyId={agencyId}
        selectedMonth={selectedMonth}
      />

      <AdvancedExpenseSheet
        open={expenseSheetOpen}
        onOpenChange={setExpenseSheetOpen}
        cashFlow={cashFlow}
        expensesByCategory={expensesByCategory}
        agencyId={agencyId}
        selectedMonth={selectedMonth}
        onEditExpense={onEditExpenseById}
      />
    </div>
  );
}
