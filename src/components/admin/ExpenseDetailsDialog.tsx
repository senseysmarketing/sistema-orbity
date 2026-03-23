import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Edit, Trash2, Info, History, TrendingUp, BarChart3, Calendar, DollarSign, Repeat, Power, PowerOff, Link, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { ExpenseHealthIndicator } from "./ExpenseHealthIndicator";
import { ExpensePaymentHistory } from "./ExpensePaymentHistory";
import { ExpenseProjection } from "./ExpenseProjection";
import { ExpenseAnalytics } from "./ExpenseAnalytics";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  expense_type?: 'avulsa' | 'recorrente' | 'parcelada';
  category?: string;
  installment_total?: number;
  installment_current?: number;
  recurrence_day?: number;
  description?: string;
  is_active?: boolean;
  parent_expense_id?: string | null;
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
  onDeleteInstance?: (expense: Expense) => void;
  onCancelSubscription?: (expense: Expense) => void;
  onRefresh?: () => void;
  onViewMaster?: (masterId: string) => void;
}

export function ExpenseDetailsDialog({
  expense,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDeleteInstance,
  onCancelSubscription,
  onRefresh,
  onViewMaster,
}: ExpenseDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [relatedExpenses, setRelatedExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(expense?.is_active !== false);

  // Verificar se é uma despesa mestra recorrente
  const isMasterRecurring = expense?.expense_type === 'recorrente' && !expense?.parent_expense_id;
  
  // Verificar se é uma instância gerada
  const isGeneratedInstance = expense?.expense_type === 'recorrente' && !!expense?.parent_expense_id;

  useEffect(() => {
    if (expense) {
      setIsActive(expense.is_active !== false);
    }
  }, [expense]);

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

  const toggleRecurringStatus = async () => {
    if (!expense) return;

    const newStatus = !isActive;
    
    const { error } = await supabase
      .from('expenses')
      .update({ is_active: newStatus })
      .eq('id', expense.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da recorrência.",
        variant: "destructive",
      });
      return;
    }

    setIsActive(newStatus);
    
    toast({
      title: newStatus ? "Recorrência ativada" : "Recorrência encerrada",
      description: newStatus 
        ? "A despesa voltará a ser gerada automaticamente todo mês."
        : "A despesa não será mais gerada automaticamente.",
    });

    onRefresh?.();
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
              {/* Alerta para instâncias geradas */}
              {isGeneratedInstance && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm">
                        Esta é uma instância mensal de uma despesa recorrente. Para encerrar ou reativar a geração automática, acesse a despesa mestra.
                      </span>
                      {onViewMaster && expense?.parent_expense_id && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="shrink-0 border-blue-400 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900"
                          onClick={() => {
                            onOpenChange(false);
                            onViewMaster(expense.parent_expense_id!);
                          }}
                        >
                          <Link className="h-3 w-3 mr-1" />
                          Ver Mestra
                        </Button>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

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

              {/* Status de recorrência para despesas mestras */}
              {isMasterRecurring && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Recorrência Automática
                  </h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">
                        {isActive 
                          ? "Esta despesa é gerada automaticamente todo mês."
                          : "A recorrência está encerrada. Não serão geradas novas instâncias."
                        }
                      </p>
                    </div>
                    <Button
                      variant={isActive ? "outline" : "default"}
                      size="sm"
                      onClick={toggleRecurringStatus}
                      className="gap-2"
                    >
                      {isActive ? (
                        <>
                          <PowerOff className="h-4 w-4" />
                          Encerrar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4" />
                          Reativar
                        </>
                      )}
                    </Button>
                  </div>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className={isActive 
                      ? "bg-emerald-600 text-white" 
                      : "bg-muted text-muted-foreground"
                    }
                  >
                    {isActive ? "Ativa" : "Encerrada"}
                  </Badge>
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
              <ExpensePaymentHistory payments={relatedExpenses} />
            </TabsContent>

            <TabsContent value="projection" className="mt-4">
              <ExpenseProjection
                expenseType={expense.expense_type}
                amount={expense.amount}
                recurrenceDay={expense.recurrence_day}
                installmentTotal={expense.installment_total}
                installmentCurrent={expense.installment_current}
                dueDate={expense.due_date}
              />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <ExpenseAnalytics
                payments={relatedExpenses}
                expenseType={expense.expense_type}
              />
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

      {/* Alert Dialog para Exclusão Inteligente */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {expense.expense_type === 'recorrente' || expense.parent_expense_id
                ? 'Excluir Despesa Recorrente'
                : 'Excluir Despesa'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {expense.expense_type === 'recorrente' || expense.parent_expense_id
                ? `Esta despesa "${expense.name}" faz parte de uma recorrência. O que você deseja fazer?`
                : `Tem certeza que deseja excluir a despesa "${expense.name}"? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={expense.expense_type === 'recorrente' || expense.parent_expense_id ? 'flex-col sm:flex-row gap-2' : ''}>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {expense.expense_type === 'recorrente' || expense.parent_expense_id ? (
              <>
                <AlertDialogAction
                  onClick={() => {
                    onDeleteInstance?.(expense);
                    onOpenChange(false);
                    setShowDeleteAlert(false);
                  }}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  Apagar apenas esta
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => {
                    onCancelSubscription?.(expense);
                    onOpenChange(false);
                    setShowDeleteAlert(false);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Cancelar Assinatura
                </AlertDialogAction>
              </>
            ) : (
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
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
