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
  categoryIcon?: string;
  onView: (item: any) => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onUpdateStatus: (id: string, status: 'pending' | 'paid' | 'overdue') => void;
}

export function ExpenseCard({
  item,
  categoryIcon,
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
      className={`cursor-pointer transition-all hover:shadow-lg border-l-4 ${getCardBackground()}`}
      onClick={() => onView(item)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone, título e menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              {/* Ícone Principal */}
              <div className="p-3 bg-primary/10 rounded-xl">
                {item.type === 'salary' ? (
                  <Wallet className="h-6 w-6 text-primary" />
                ) : categoryIcon ? (
                  <span className="text-2xl">{categoryIcon}</span>
                ) : (
                  <Receipt className="h-6 w-6 text-primary" />
                )}
              </div>
              
              {/* Título e Badges */}
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg leading-tight">
                  {item.type === 'salary' ? `Salário - ${item.employee_name}` : item.name}
                </h3>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Badge de Status */}
                  <Badge className={getStatusColor(item.status)}>
                    {item.status === 'paid' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {item.status === 'pending' && <Timer className="h-3 w-3 mr-1" />}
                    {item.status === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {getStatusLabel(item.status)}
                  </Badge>
                  
                  {/* Badge de Tipo */}
                  <Badge variant={item.type === 'salary' ? 'default' : 'outline'}>
                    {getTypeLabel()}
                  </Badge>

                  {/* Badge de Categoria */}
                  {item.type === 'expense' && 'category' in item && item.category && (
                    <Badge variant="secondary" className="text-xs">
                      <Building className="h-3 w-3 mr-1" />
                      {item.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Menu de Ações */}
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

          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-4">
            {/* Valor */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span>Valor</span>
              </div>
              <p className="text-lg font-bold text-primary">
                R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Vencimento */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Vencimento</span>
              </div>
              <p className="text-sm font-semibold">
                {item.type === 'expense' && 'expense_type' in item && item.expense_type === 'recorrente' ? (
                  <span>Todo dia {item.recurrence_day}</span>
                ) : (
                  <span>{new Date(item.due_date).toLocaleDateString('pt-BR')}</span>
                )}
              </p>
            </div>
          </div>

          {/* Data de Pagamento */}
          {item.paid_date && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Pago em: {formatDate(item.paid_date)}
              </span>
            </div>
          )}

          {/* Informações Adicionais - Despesas */}
          {item.type === 'expense' && (
            <div className="pt-3 border-t space-y-2">
              {/* Parcelas */}
              {'expense_type' in item && item.expense_type === 'parcelada' && item.installment_total && (
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Parcela</span>
                  </div>
                  <span className="text-sm font-semibold">{item.installment_current}/{item.installment_total}</span>
                </div>
              )}

              {/* Descrição */}
              {'description' in item && item.description && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Descrição:</span>
                  <p className="text-xs bg-muted/40 rounded-lg p-2.5 leading-relaxed">{item.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}