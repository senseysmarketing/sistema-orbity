import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDownCircle, ArrowUpCircle, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MarkAsPaidPopover } from "./MarkAsPaidPopover";
import type { CashFlowItem, CategoryTotal } from "@/hooks/useFinancialMetrics";

type FilterType = 'all' | 'next7' | 'overdue';

interface CashFlowTableProps {
  cashFlow: CashFlowItem[];
  expensesByCategory: CategoryTotal[];
  onMarkAsPaid: (params: { id: string; sourceType: string; paidDate: string; paidAmount: number }) => void;
  isMarkingAsPaid: boolean;
  className?: string;
}

export function CashFlowTable({ cashFlow, expensesByCategory, onMarkAsPaid, isMarkingAsPaid, className }: CashFlowTableProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = useMemo(() => {
    const today = new Date();
    const in7Days = new Date();
    in7Days.setDate(today.getDate() + 7);

    return cashFlow.filter(item => {
      if (filter === 'overdue') return item.status === 'OVERDUE';
      if (filter === 'next7') {
        const d = new Date(item.dueDate);
        return d >= today && d <= in7Days && item.status !== 'PAID';
      }
      return true;
    });
  }, [cashFlow, filter]);

  const maxCategoryTotal = expensesByCategory.length > 0 ? expensesByCategory[0].total : 1;
  const overdueCount = cashFlow.filter(i => i.status === 'OVERDUE').length;

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 hover:bg-emerald-100">Pago</Badge>;
      case 'OVERDUE': return <Badge variant="destructive">Atrasado</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 hover:bg-amber-100">Pendente</Badge>;
    }
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
            <div className="flex gap-1.5">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilter('all')}>
                Este Mês
              </Button>
              <Button variant={filter === 'next7' ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => setFilter('next7')}>
                Próx. 7 dias
              </Button>
              <Button
                variant={filter === 'overdue' ? 'destructive' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setFilter('overdue')}
              >
                Atrasados {overdueCount > 0 && `(${overdueCount})`}
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
                  filtered.map(item => (
                    <TableRow key={`${item.sourceType}-${item.id}`} className={item.status === 'OVERDUE' ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''}>
                      <TableCell className="pr-0">
                        {item.type === 'INCOME' ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{item.title}</TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${item.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {item.type === 'INCOME' ? '+' : '-'} {formatCurrency(item.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        {item.status !== 'PAID' && (
                          <MarkAsPaidPopover
                            originalAmount={item.amount}
                            isLoading={isMarkingAsPaid}
                            onConfirm={(paidDate, paidAmount) => {
                              onMarkAsPaid({ id: item.sourceId, sourceType: item.sourceType, paidDate, paidAmount });
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Categorias de Custo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {expensesByCategory.slice(0, 5).map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {cat.icon && <span className="text-xs">{cat.icon}</span>}
                    {cat.category}
                  </span>
                  <span className="font-semibold">{formatCurrency(cat.total)}</span>
                </div>
                <Progress
                  value={(cat.total / maxCategoryTotal) * 100}
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
