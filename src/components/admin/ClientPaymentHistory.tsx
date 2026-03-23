import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, AlertCircle, Trash2, Calendar, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
}

interface ClientPaymentHistoryProps {
  payments: Payment[];
  onMarkAsPaid: (paymentId: string) => void;
  onDeletePayment: (paymentId: string) => void;
  onUpdateDueDate: (paymentId: string, newDueDate: string) => void;
}

export function ClientPaymentHistory({ payments, onMarkAsPaid, onDeletePayment, onUpdateDueDate }: ClientPaymentHistoryProps) {
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [newDueDate, setNewDueDate] = useState<string>("");
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'overdue':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 text-white">Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white">Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-600 text-white">Atrasado</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    // Parse como data UTC e formata apenas a data, ignorando timezone
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const formatMonth = (dateString: string) => {
    const [year, month] = dateString.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const sortedPayments = [...payments].sort((a, b) => 
    new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  );

  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  const handleStartEdit = (paymentId: string, currentDueDate: string) => {
    setEditingPaymentId(paymentId);
    setNewDueDate(currentDueDate.split('T')[0]);
  };

  const handleSaveEdit = (paymentId: string) => {
    if (newDueDate) {
      onUpdateDueDate(paymentId, newDueDate);
      setEditingPaymentId(null);
      setNewDueDate("");
    }
  };

  const handleCancelEdit = () => {
    setEditingPaymentId(null);
    setNewDueDate("");
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum pagamento registrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-h-[500px] overflow-y-auto pr-2">
        <div className="space-y-4">
          <div className="relative">
            {/* Timeline vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            
            {sortedPayments.map((payment, index) => (
              <Card 
                key={payment.id} 
                className={`relative ml-14 mb-4 ${
                  payment.status === 'paid' 
                    ? 'bg-green-50/50 dark:bg-green-950/20' 
                    : payment.status === 'overdue'
                    ? 'bg-red-50/50 dark:bg-red-950/20'
                    : 'bg-yellow-50/50 dark:bg-yellow-950/20'
                }`}
              >
                {/* Ponto na timeline */}
                <div className="absolute -left-14 top-6 z-10">
                  {getStatusIcon(payment.status)}
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold capitalize">
                          {formatMonth(payment.due_date)}
                        </h4>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      <p className="text-2xl font-bold text-primary">
                        R$ {payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {editingPaymentId === payment.id ? (
                          <div className="flex items-center gap-2">
                            <span>Vencimento:</span>
                            <Input
                              type="date"
                              value={newDueDate}
                              onChange={(e) => setNewDueDate(e.target.value)}
                              className="w-40 h-8"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSaveEdit(payment.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p>Vencimento: {formatDate(payment.due_date)}</p>
                        )}
                        {payment.paid_date && (
                          <p className="text-green-600 dark:text-green-400">
                            Pago em: {formatDate(payment.paid_date)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {payment.status !== 'paid' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => onMarkAsPaid(payment.id)}
                          >
                            Marcar como Pago
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(payment.id, payment.due_date)}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Alterar Data
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPaymentToDelete(payment.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Dialog para Confirmação de Exclusão */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (paymentToDelete) {
                  onDeletePayment(paymentToDelete);
                  setPaymentToDelete(null);
                }
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
