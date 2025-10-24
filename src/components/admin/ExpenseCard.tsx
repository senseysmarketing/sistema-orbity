import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, MoreHorizontal, Edit, Eye, Trash2, CheckCircle, Clock, AlertTriangle, Repeat, Wallet, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
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
  const [category, setCategory] = useState<any>(null);
  const { currentAgency } = useAgency();

  useEffect(() => {
    if (item.type === 'expense' && 'category' in item && item.category && currentAgency) {
      fetchCategory();
    }
  }, [item, currentAgency]);

  const fetchCategory = async () => {
    if (item.type !== 'expense' || !('category' in item) || !item.category || !currentAgency) return;

    const { data } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('id', item.category)
      .eq('agency_id', currentAgency.id)
      .single();

    if (data) {
      setCategory(data);
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 text-white hover:bg-green-700">💰 Pago</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">⏰ Pagamento Pendente</Badge>;
      case 'overdue':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">🚨 Atrasado</Badge>;
      default:
        return <Badge>{status}</Badge>;
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

  // Calcular urgência
  const getUrgencyLevel = () => {
    if (item.status === 'paid') return null;
    const today = new Date();
    const due = new Date(item.due_date);
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (item.status === 'overdue') return 'overdue';
    if (daysUntilDue <= 3) return 'urgent';
    if (daysUntilDue <= 7) return 'soon';
    return null;
  };

  const urgencyLevel = getUrgencyLevel();

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg border ${getCardBackground()} ${
        urgencyLevel === 'urgent' || urgencyLevel === 'overdue' ? 'ring-2 ring-red-400 dark:ring-red-600' : ''
      }`}
      onClick={() => onView(item)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone da categoria, badges e menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div>
                {item.type === 'salary' ? (
                  <Wallet className="h-6 w-6 text-primary" />
                ) : category ? (
                  <span className="text-3xl">{category.icon}</span>
                ) : (
                  <Receipt className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(item.status)}
                  <Badge variant="outline">
                    {item.type === 'salary' ? 'Salário' : 'Despesa'}
                  </Badge>
                  {item.type === 'expense' && 'expense_type' in item && item.expense_type && (
                    <Badge variant="secondary" className="gap-1">
                      {item.expense_type === 'recorrente' && <Repeat className="h-3 w-3" />}
                      {item.expense_type === 'parcelada' && <Calendar className="h-3 w-3" />}
                      {getTypeLabel()}
                    </Badge>
                  )}
                  {category && (
                    <Badge 
                      variant="outline"
                      className="gap-1"
                      style={{ 
                        borderColor: category.color,
                        color: category.color 
                      }}
                    >
                      {category.name}
                    </Badge>
                  )}
                  {urgencyLevel === 'urgent' && (
                    <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                      ⚠️ Vence em breve
                    </Badge>
                  )}
                  {urgencyLevel === 'overdue' && (
                    <Badge className="bg-red-600 text-white hover:bg-red-700 animate-pulse">
                      🚨 Atrasado
                    </Badge>
                  )}
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
                  <Clock className="mr-2 h-4 w-4" />
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

          {/* Nome da despesa/salário */}
          <div>
            <h3 className="font-semibold text-lg">
              {item.type === 'salary' ? item.employee_name : item.name}
            </h3>
            {item.type === 'expense' && 'description' in item && item.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
            )}
          </div>

          {/* Valor e data de vencimento */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {item.type === 'expense' && 'expense_type' in item && item.expense_type === 'recorrente' && 'recurrence_day' in item && item.recurrence_day
                  ? `Dia ${item.recurrence_day} de cada mês`
                  : `Venc: ${new Date(item.due_date).toLocaleDateString('pt-BR')}`
                }
              </span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <DollarSign className="h-4 w-4" />
              <span>R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Data de pagamento se pago */}
          {item.paid_date && (
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-900">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                Pago em: {formatDate(item.paid_date)}
              </p>
            </div>
          )}

          {/* Informações específicas de despesas parceladas */}
          {item.type === 'expense' && 'expense_type' in item && item.expense_type === 'parcelada' && 'installment_total' in item && item.installment_total && 'installment_current' in item && item.installment_current && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {item.installment_current}/{item.installment_total} parcelas pagas
                </span>
              </div>
              <Progress 
                value={(item.installment_current / item.installment_total) * 100} 
                className="h-2"
              />
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-muted-foreground">Restante</span>
                <span className="font-medium text-primary">
                  R$ {(item.amount * (item.installment_total - item.installment_current)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Informação de despesa recorrente */}
          {item.type === 'expense' && 'expense_type' in item && item.expense_type === 'recorrente' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat className="h-3 w-3" />
              <span>Despesa recorrente mensal</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
