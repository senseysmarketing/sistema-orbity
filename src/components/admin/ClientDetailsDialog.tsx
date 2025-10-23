import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, FileText, UserX, Info, History, TrendingUp, BarChart3 } from "lucide-react";
import { ClientHealthIndicator } from "./ClientHealthIndicator";
import { ClientPaymentHistory } from "./ClientPaymentHistory";
import { ClientRevenueProjection } from "./ClientRevenueProjection";
import { ClientAnalytics } from "./ClientAnalytics";

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

interface Payment {
  id: string;
  client_id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

interface ClientDetailsDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payments: Payment[];
  onEdit: (client: Client) => void;
  onGenerateContract: (client: Client) => void;
  onDeactivate: (client: Client) => void;
  onMarkPaymentAsPaid: (paymentId: string) => void;
}

export function ClientDetailsDialog({
  client,
  open,
  onOpenChange,
  payments,
  onEdit,
  onGenerateContract,
  onDeactivate,
  onMarkPaymentAsPaid,
}: ClientDetailsDialogProps) {
  if (!client) return null;

  const clientPayments = payments.filter(p => p.client_id === client.id);
  
  // Calcula métricas para o indicador de saúde
  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  
  const latePaymentsLast3Months = clientPayments.filter(p => {
    if (!p.paid_date || p.status !== 'paid') return false;
    const paidDate = new Date(p.paid_date);
    const dueDate = new Date(p.due_date);
    return paidDate > dueDate && paidDate >= threeMonthsAgo;
  }).length;

  const loyaltyEndsInDays = client.contract_end_date 
    ? Math.ceil((new Date(client.contract_end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Calcula taxa de renovação (para clientes sem fidelidade)
  const paidPayments = clientPayments.filter(p => p.status === 'paid');
  const renewalRate = paidPayments.length > 0 ? (paidPayments.length / clientPayments.length) * 100 : 0;

  const monthsAsClient = client.start_date
    ? Math.max(1, Math.floor((now.getTime() - new Date(client.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)))
    : 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{client.name}</span>
              <Badge variant={client.active ? "default" : "destructive"}>
                {client.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={() => onGenerateContract(client)}>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Contrato
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  onDeactivate(client);
                  onOpenChange(false);
                }}
              >
                <UserX className="h-4 w-4 mr-2" />
                Desativar
              </Button>
            </div>
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
              Previsão
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Análise
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {/* Indicador de Saúde */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-3">Saúde Financeira do Cliente</h3>
              <ClientHealthIndicator
                latePaymentsLast3Months={latePaymentsLast3Months}
                hasLoyalty={client.has_loyalty}
                loyaltyEndsInDays={loyaltyEndsInDays}
                renewalRate={renewalRate}
              />
            </div>

            {/* Informações Gerais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Serviço</label>
                <p className="text-base">{client.service || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor Mensal</label>
                <p className="text-base font-semibold text-primary">
                  R$ {(client.monthly_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Dia de Vencimento</label>
                <p className="text-base">Dia {client.due_date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Contato</label>
                <p className="text-base">{client.contact || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Cliente desde</label>
                <p className="text-base">
                  {client.start_date 
                    ? new Date(client.start_date).toLocaleDateString('pt-BR')
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status de Fidelidade</label>
                <p className="text-base">
                  {client.has_loyalty ? (
                    <Badge className="bg-blue-500 text-white">Com Fidelidade</Badge>
                  ) : (
                    <Badge variant="outline">Sem Fidelidade</Badge>
                  )}
                </p>
              </div>
              {client.has_loyalty && (
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Início do Contrato</label>
                    <p className="text-base">
                      {client.contract_start_date 
                        ? new Date(client.contract_start_date).toLocaleDateString('pt-BR')
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fim do Contrato</label>
                    <p className="text-base">
                      {client.contract_end_date 
                        ? new Date(client.contract_end_date).toLocaleDateString('pt-BR')
                        : 'N/A'
                      }
                    </p>
                  </div>
                </>
              )}
            </div>

            {client.observations && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <p className="text-base mt-1 p-3 bg-muted rounded-lg">{client.observations}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ClientPaymentHistory 
              payments={clientPayments}
              onMarkAsPaid={onMarkPaymentAsPaid}
            />
          </TabsContent>

          <TabsContent value="projection" className="mt-4">
            <ClientRevenueProjection
              hasLoyalty={client.has_loyalty}
              contractEndDate={client.contract_end_date}
              monthlyValue={client.monthly_value || 0}
              renewalRate={renewalRate}
              monthsAsClient={monthsAsClient}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <ClientAnalytics
              payments={clientPayments}
              monthlyValue={client.monthly_value || 0}
              startDate={client.start_date}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
