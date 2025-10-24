import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, DollarSign, User, FileText, Trash2, Edit, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { SalaryPaymentHistory } from "./SalaryPaymentHistory";
import { SalaryProjection } from "./SalaryProjection";
import { SalaryAnalytics } from "./SalaryAnalytics";

interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  observations?: string;
  position?: string;
  department?: string;
}

interface SalaryDetailsDialogProps {
  salary: Salary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function SalaryDetailsDialog({
  salary,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: SalaryDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [relatedSalaries, setRelatedSalaries] = useState<Salary[]>([]);
  const { currentAgency } = useAgency();

  useEffect(() => {
    if (open && salary && currentAgency) {
      fetchRelatedSalaries();
    }
  }, [open, salary, currentAgency]);

  const fetchRelatedSalaries = async () => {
    if (!salary || !currentAgency) return;

    const { data } = await supabase
      .from('salaries')
      .select('*')
      .eq('agency_id', currentAgency.id)
      .eq('employee_name', salary.employee_name)
      .order('due_date', { ascending: false })
      .limit(12);

    if (data) {
      setRelatedSalaries(data);
    }
  };

  if (!salary) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'pending':
        return 'bg-yellow-600 text-white hover:bg-yellow-700';
      case 'overdue':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return '💰 Pago';
      case 'pending': return '⏰ Pagamento Pendente';
      case 'overdue': return '🚨 Atrasado';
      default: return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Cálculo de métricas de saúde
  const latePaymentsLast6Months = relatedSalaries.filter(s => {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - 6);
    return s.status === 'overdue' && new Date(s.due_date) >= monthsAgo;
  }).length;

  const averageDaysLate = relatedSalaries
    .filter(s => s.paid_date && s.status !== 'pending')
    .reduce((acc, s) => {
      const dueDate = new Date(s.due_date);
      const paidDate = new Date(s.paid_date!);
      const daysLate = Math.max(0, Math.ceil((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return acc + daysLate;
    }, 0) / Math.max(1, relatedSalaries.filter(s => s.paid_date).length);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <DialogTitle className="text-2xl">{salary.employee_name}</DialogTitle>
                <DialogDescription>
                  Detalhes completos do salário
                </DialogDescription>
              </div>
              <Badge className={getStatusColor(salary.status)}>
                {getStatusLabel(salary.status)}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="projection">Projeção</TabsTrigger>
              <TabsTrigger value="analytics">Análise</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações do Salário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Funcionário
                      </p>
                      <p className="font-semibold">{salary.employee_name}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor
                      </p>
                      <p className="font-semibold text-lg text-primary">
                        R$ {salary.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {salary.position && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Cargo</p>
                        <p className="font-medium">{salary.position}</p>
                      </div>
                    )}

                    {salary.department && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Departamento</p>
                        <p className="font-medium">{salary.department}</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data de Vencimento
                      </p>
                      <p className="font-medium">{formatDate(salary.due_date)}</p>
                    </div>

                    {salary.paid_date && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Data de Pagamento
                        </p>
                        <p className="font-medium text-green-600">{formatDate(salary.paid_date)}</p>
                      </div>
                    )}
                  </div>

                  {salary.observations && (
                    <div className="space-y-1 pt-4 border-t">
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Observações
                      </p>
                      <p className="text-sm">{salary.observations}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Indicador de Saúde */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Indicador de Saúde do Funcionário</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Atrasos nos últimos 6 meses</p>
                      <p className="text-2xl font-bold text-red-600">{latePaymentsLast6Months}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Média de dias de atraso</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {averageDaysLate.toFixed(1)} dias
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <SalaryPaymentHistory salaries={relatedSalaries} />
            </TabsContent>

            <TabsContent value="projection">
              <SalaryProjection salary={salary} relatedSalaries={relatedSalaries} />
            </TabsContent>

            <TabsContent value="analytics">
              <SalaryAnalytics salary={salary} relatedSalaries={relatedSalaries} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
            <Button onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o salário de {salary.employee_name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteAlert(false);
                onOpenChange(false);
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
