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
}

interface ClientCardProps {
  client: Client;
  paymentsThisYear: number;
  totalPaymentsYear: number;
  nextPaymentDate: string | null;
  nextPaymentStatus: 'paid' | 'pending' | 'overdue' | null;
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

  // Define cor de fundo baseado no status do próximo pagamento
  const getCardBackground = () => {
    if (!nextPaymentStatus) return 'bg-card';
    
    switch (nextPaymentStatus) {
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const paymentProgress = totalPaymentsYear > 0 ? (paymentsThisYear / totalPaymentsYear) * 100 : 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${getCardBackground()} ${
        loyaltyStatus === 'expiring' ? 'border-orange-400 dark:border-orange-600 border-2' : ''
      }`}
      onClick={() => onView(client)}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header com ícone, badges e menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building className="h-5 w-5 text-primary" />
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
                  
                  {nextPaymentStatus === 'paid' && (
                    <Badge className="bg-green-600 text-white hover:bg-green-700">
                      💰 Pagamento em Dia
                    </Badge>
                  )}
                  {nextPaymentStatus === 'pending' && (
                    <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">
                      ⏰ Pagamento Pendente
                    </Badge>
                  )}
                  {nextPaymentStatus === 'overdue' && (
                    <Badge className="bg-red-600 text-white hover:bg-red-700">
                      🚨 Pagamento Atrasado
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

          {/* Cliente desde */}
          {client.start_date && (
            <p className="text-xs text-muted-foreground">
              Cliente desde: {formatDate(client.start_date)}
            </p>
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
