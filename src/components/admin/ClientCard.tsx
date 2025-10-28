import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Building, Calendar, DollarSign, MoreHorizontal, Edit, Eye, Trash2, FileText, Bell, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  name: string;
  monthly_value: number | null;
  active: boolean;
  start_date: string | null;
  contact: string | null;
  service: string | null;
  due_date: number;
  observations: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  has_loyalty: boolean;
  cancelled_at: string | null;
}

interface ClientCardProps {
  client: Client;
  paymentsThisYear: number;
  totalPaymentsYear: number;
  nextPaymentDate: string | null;
  nextPaymentStatus: 'paid' | 'pending' | 'overdue' | null;
  currentMonthPaymentStatus: 'paid' | 'pending' | 'overdue' | null;
  onView: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onGenerateContract: (client: Client) => void;
  onCreateReminder: (client: Client) => void;
}

export function ClientCard({
  client,
  paymentsThisYear,
  totalPaymentsYear,
  nextPaymentDate,
  nextPaymentStatus,
  currentMonthPaymentStatus,
  onView,
  onEdit,
  onDelete,
  onGenerateContract,
  onCreateReminder,
}: ClientCardProps) {
  // Calcula status de fidelidade
  const getLoyaltyStatus = () => {
    if (!client.has_loyalty || !client.contract_end_date) return null;
    
    const endDate = new Date(client.contract_end_date);
    const today = new Date();
    const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilEnd < 0) return 'expired';
    if (daysUntilEnd <= 30) return 'expiring';
    return 'active';
  };

  const loyaltyStatus = getLoyaltyStatus();

  // Define borda colorida baseado no status
  const getCardBorder = () => {
    // Prioriza fidelidade vencendo
    if (loyaltyStatus === 'expiring') {
      return 'border-orange-400 dark:border-orange-600 border-2';
    }
    if (loyaltyStatus === 'expired') {
      return 'border-red-400 dark:border-red-600 border-2';
    }
    
    // Se não tem status de fidelidade especial, usa status de pagamento
    if (!nextPaymentStatus) return '';
    
    switch (nextPaymentStatus) {
      case 'overdue':
        return 'border-red-400 dark:border-red-600 border-2';
      case 'pending':
        return 'border-yellow-400 dark:border-yellow-600 border-2';
      case 'paid':
        return 'border-green-400 dark:border-green-600 border-2';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const paymentProgress = totalPaymentsYear > 0 ? (paymentsThisYear / totalPaymentsYear) * 100 : 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${getCardBorder()}`}
      onClick={() => onView(client)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone, badges e menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div>
                <Building className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={client.active ? "default" : "destructive"}>
                    {client.active ? "Ativo" : "Inativo"}
                  </Badge>
                  
                  {client.has_loyalty && (
                    <>
                      {loyaltyStatus === 'active' && (
                        <Badge className="bg-blue-500 text-white hover:bg-blue-600">
                          🔒 Com Fidelidade
                        </Badge>
                      )}
                      {loyaltyStatus === 'expiring' && (
                        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                          ⚠️ Fidelidade Vencendo
                        </Badge>
                      )}
                      {loyaltyStatus === 'expired' && (
                        <Badge variant="destructive">
                          ❌ Fidelidade Vencida
                        </Badge>
                      )}
                    </>
                  )}
                  
                  {currentMonthPaymentStatus === 'paid' && (
                    <Badge className="bg-green-600 text-white hover:bg-green-700">
                      💰 Pago este Mês
                    </Badge>
                  )}
                  {currentMonthPaymentStatus === 'pending' && (
                    <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">
                      ⏰ Pendente este Mês
                    </Badge>
                  )}
                  {currentMonthPaymentStatus === 'overdue' && (
                    <Badge className="bg-red-600 text-white hover:bg-red-700">
                      🚨 Atrasado este Mês
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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(client); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(client); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onGenerateContract(client); }}>
                  <FileText className="mr-2 h-4 w-4" />
                  Gerar Contrato
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateReminder(client); }}>
                  <Bell className="mr-2 h-4 w-4" />
                  Criar Lembrete
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Desativar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Nome e Serviço */}
          <div>
            <h3 className="font-semibold text-lg">{client.name}</h3>
            {client.service && (
              <p className="text-sm text-muted-foreground">{client.service}</p>
            )}
          </div>

          {/* Informações de Pagamento */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Venc: Dia {client.due_date}</span>
            </div>
            <div className="flex items-center gap-2 font-semibold text-primary">
              <DollarSign className="h-4 w-4" />
              <span>R$ {(client.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Cliente desde / Data de inativação */}
          {client.start_date && client.active && (
            <p className="text-xs text-muted-foreground">
              Cliente desde: {formatDate(client.start_date)}
            </p>
          )}
          {!client.active && client.cancelled_at && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-900">
              <UserX className="h-4 w-4 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                Inativado em: {formatDate(client.cancelled_at)}
              </p>
            </div>
          )}

          {/* Progress Bar de Pagamentos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Pagamentos recebidos este ano</span>
              <span className="font-medium">{paymentsThisYear}/{totalPaymentsYear}</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
