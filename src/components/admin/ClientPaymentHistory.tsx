import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface ClientPaymentHistoryProps {
  payments: Payment[];
  onMarkAsPaid: (paymentId: string) => void;
}

export function ClientPaymentHistory({ payments, onMarkAsPaid }: ClientPaymentHistoryProps) {
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

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum pagamento registrado</p>
      </div>
    );
  }

  return (
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
              <div className="flex items-start justify-between">
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
                    <p>Vencimento: {formatDate(payment.due_date)}</p>
                    {payment.paid_date && (
                      <p className="text-green-600 dark:text-green-400">
                        Pago em: {formatDate(payment.paid_date)}
                      </p>
                    )}
                  </div>
                </div>
                
                {payment.status !== 'paid' && (
                  <Button
                    size="sm"
                    onClick={() => onMarkAsPaid(payment.id)}
                    className="ml-4"
                  >
                    Marcar como Pago
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
