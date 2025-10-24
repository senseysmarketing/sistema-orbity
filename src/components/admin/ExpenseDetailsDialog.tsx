import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Info, History, TrendingUp, BarChart3, Calendar, DollarSign, Building } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { ExpenseHealthIndicator } from "./ExpenseHealthIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useAgency } from "@/hooks/useAgency";

interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  expense_type?: 'avulsa' | 'recorrente' | 'parcelada';
  category?: string;
  installment_total?: number;
  installment_current?: number;
  recurrence_day?: number;
  description?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface ExpenseDetailsDialogProps {
  expense: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: ExpenseDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [relatedExpenses, setRelatedExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const { currentAgency } = useAgency();

  useEffect(() => {
    if (expense && open) {
      fetchRelatedExpenses();
      fetchCategory();
    }
  }, [expense, open]);

  const fetchCategory = async () => {
    if (!expense?.category || !currentAgency) return;

    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', expense.category)
      .eq('agency_id', currentAgency.id)
      .single();

    if (data) {
      setCategory(data);
    }
  };

  const fetchRelatedExpenses = async () => {
    if (!expense || !currentAgency) return;

    // Buscar despesas relacionadas baseado no nome e tipo
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .eq('name', expense.name)
      .order('due_date', { ascending: false })
      .limit(12);

    if (data) {
      setRelatedExpenses(data);
    }
  };

  if (!expense) return null;

  // Calcular métricas de saúde
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentExpenses = relatedExpenses.filter(e => 
    new Date(e.due_date) >= sixMonthsAgo
  );

  const latePayments = recentExpenses.filter(e => {
    if (!e.paid_date || e.status !== 'paid') return false;
    const paidDate = new Date(e.paid_date);
    const dueDate = new Date(e.due_date);
    return paidDate > dueDate;
  });

  const latePaymentsLast6Months = latePayments.length;

  const averageDaysLate = latePayments.length > 0
    ? latePayments.reduce((sum, e) => {
        const paidDate = new Date(e.paid_date!);
        const dueDate = new Date(e.due_date);
        const daysLate = Math.ceil((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + daysLate;
      }, 0) / latePayments.length
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'overdue': return 'Atrasado';
      default: return status;
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'avulsa': return 'Avulsa';
      case 'recorrente': return 'Recorrente';
      case 'parcelada': return 'Parcelada';
      default: return 'N/A';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span>{expense.name}</span>
              <Badge className={getStatusColor(expense.status)}>
                {getStatusLabel(expense.status)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">
                <Info className="h-4 w-4 mr-2" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="projection">
                <TrendingUp className="h-4 w-4 mr-2" />
                Projeção
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Análise
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              {/* Indicador de Saúde */}
              <ExpenseHealthIndicator
                latePaymentsLast6Months={latePaymentsLast6Months}
                averageDaysLate={averageDaysLate}
                totalPayments={recentExpenses.length}
              />

              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome da Despesa</label>
                  <p className="text-base font-semibold">{expense.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valor</label>
                  <p className="text-base font-semibold text-primary">
                    R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                  <p className="text-base">
                    <Badge variant="outline">{getTypeLabel(expense.expense_type)}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                  <p className="text-base">
                    {category ? (
                      <Badge 
                        variant="outline"
                        className="gap-1"
                      >
                        <span>{category.icon}</span>
                        {category.name}
                      </Badge>
                    ) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {expense.expense_type === 'recorrente' ? 'Dia de Recorrência' : 'Data de Vencimento'}
                  </label>
                  <p className="text-base">
                    {expense.expense_type === 'recorrente' && expense.recurrence_day
                      ? `Dia ${expense.recurrence_day} de cada mês`
                      : formatDate(expense.due_date)
                    }
                  </p>
                </div>
                {expense.paid_date && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Pagamento</label>
                    <p className="text-base text-green-600 dark:text-green-400 font-medium">
                      {formatDate(expense.paid_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Informações específicas por tipo */}
              {expense.expense_type === 'parcelada' && expense.installment_total && expense.installment_current && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Informações da Parcela
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {expense.installment_current}/{expense.installment_total} parcelas pagas
                      </span>
                    </div>
                    <Progress 
                      value={(expense.installment_current / expense.installment_total) * 100} 
                      className="h-2"
                    />
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                        <p className="text-sm font-semibold">
                          R$ {(expense.amount * expense.installment_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Restante</p>
                        <p className="text-sm font-semibold">
                          R$ {(expense.amount * (expense.installment_total - expense.installment_current)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expense.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-base mt-1 p-3 bg-muted rounded-lg">{expense.description}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Histórico de Pagamentos</h3>
                {relatedExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {relatedExpenses.map((exp) => (
                      <div 
                        key={exp.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{formatDate(exp.due_date)}</p>
                            {exp.paid_date && (
                              <p className="text-xs text-muted-foreground">
                                Pago em: {formatDate(exp.paid_date)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-semibold">
                            R$ {exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge className={getStatusColor(exp.status)}>
                            {getStatusLabel(exp.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum histórico disponível
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="projection" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Projeção Financeira</h3>
                {expense.expense_type === 'recorrente' && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium">Projeção para os Próximos 12 Meses</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Projetado</p>
                        <p className="text-2xl font-bold text-primary">
                          R$ {(expense.amount * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Média Mensal</p>
                        <p className="text-2xl font-bold">
                          R$ {expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {expense.expense_type === 'parcelada' && expense.installment_total && expense.installment_current && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <h4 className="font-medium">Projeção de Quitação</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Parcelas Restantes</p>
                        <p className="text-2xl font-bold text-primary">
                          {expense.installment_total - expense.installment_current}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Restante</p>
                        <p className="text-2xl font-bold">
                          R$ {(expense.amount * (expense.installment_total - expense.installment_current)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Análise de Desempenho</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total de Pagamentos</p>
                    <p className="text-2xl font-bold">{relatedExpenses.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-sm text-muted-foreground mb-1">Pagos em Dia</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {recentExpenses.filter(e => e.status === 'paid' && e.paid_date && new Date(e.paid_date) <= new Date(e.due_date)).length}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                    <p className="text-sm text-muted-foreground mb-1">Pagos com Atraso</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {latePaymentsLast6Months}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowDeleteAlert(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(expense)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para Exclusão */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a despesa <strong>{expense.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(expense);
                onOpenChange(false);
                setShowDeleteAlert(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
