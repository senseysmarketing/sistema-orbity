import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, MoreHorizontal, Edit, Eye, Trash2, CheckCircle, Timer, AlertTriangle, Receipt, Building, CreditCard, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Expense {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
  is_fixed: boolean;
  expense_type?: 'avulsa' | 'recorrente' | 'parcelada';
  category?: string;
  installment_total?: number;
  installment_current?: number;
  recurrence_day?: number;
  description?: string;
}

interface Salary {
  id: string;
  employee_name: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

type ExpenseOrSalary = (Expense & { type: 'expense' }) | (Salary & { type: 'salary' });

interface ExpenseCardProps {
  item: ExpenseOrSalary;
  onView: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onUpdateStatus: (id: string, status: 'pending' | 'paid' | 'overdue') => void;
}

export function ExpenseCard({
  item,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
}: ExpenseCardProps) {
  const getCardBackground = () => {
    switch (item.status) {
      case 'overdue':
        return 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'pending':
        return 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900';
      case 'paid':
        return 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
      default:
        return 'bg-card';
    }
  };

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
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'overdue':
        return 'Atrasado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getTypeLabel = () => {
    if (item.type === 'salary') return 'Salário';
    if ('expense_type' in item) {
      switch (item.expense_type) {
        case 'avulsa': return 'Avulsa';
        case 'recorrente': return 'Recorrente';
        case 'parcelada': return 'Parcelada';
        default: return 'Despesa';
      }
    }
    return 'Despesa';
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${getCardBackground()}`}
      onClick={() => onView(item)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone, badges e menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                {item.type === 'salary' ? (
                  <Wallet className="h-5 w-5 text-primary" />
                ) : (
                  <Receipt className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(item.status)}>
                    {getStatusLabel(item.status)}
                  </Badge>
                  
                  <Badge variant={item.type === 'salary' ? 'default' : 'outline'}>
                    {getTypeLabel()}
                  </Badge>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(item); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(item.id, 'paid'); }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar como Pago
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(item.id, 'pending'); }}>
                  <Timer className="mr-2 h-4 w-4" />
                  Marcar como Pendente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdateStatus(item.id, 'overdue'); }}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Marcar como Atrasado
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nome */}
          <div>
            <h3 className="font-semibold text-lg">
              {item.type === 'salary' ? `Salário - ${item.employee_name}` : item.name}
            </h3>
          </div>

          {/* Informações de Valor */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {item.type === 'expense' && 'expense_type' in item && item.expense_type === 'recorrente' ? (
                <span>Venc: Todo dia {item.recurrence_day}</span>
              ) : (
                <span>Venc: {new Date(item.due_date).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <DollarSign className="h-4 w-4" />
              <span>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Data de Pagamento */}
          {item.paid_date && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3" />
              <span>Pago em: {formatDate(item.paid_date)}</span>
            </div>
          )}

          {/* Informações adicionais das despesas */}
          {item.type === 'expense' && (
            <div className="pt-2 border-t space-y-2">
              {'category' in item && item.category && (
                <div className="flex items-center gap-2 text-xs">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Categoria:</span>
                  <span className="font-medium">{item.category}</span>
                </div>
              )}
              {'expense_type' in item && item.expense_type === 'parcelada' && item.installment_total && (
                <div className="flex items-center gap-2 text-xs">
                  <CreditCard className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Parcela:</span>
                  <span className="font-medium">{item.installment_current}/{item.installment_total}</span>
                </div>
              )}
              {'description' in item && item.description && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Descrição:</span>
                  <p className="text-xs bg-muted/30 rounded p-2">{item.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}