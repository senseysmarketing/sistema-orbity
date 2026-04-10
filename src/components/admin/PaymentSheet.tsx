import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { useCreatePayment } from "@/hooks/useCreatePayment";
import { Ban, HelpCircle, MessageSquare, Save, X, QrCode, Copy, MoreVertical, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payment?: any;
  preselectedClient?: { id: string; name: string; monthly_value?: number | null };
  clients?: any[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "warning" | "success" | "danger" | "secondary" }> = {
  pending: { label: "Pendente", variant: "warning" },
  overdue: { label: "Atrasado", variant: "danger" },
  paid: { label: "Pago", variant: "success" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

export function PaymentSheet({ open, onOpenChange, onSuccess, payment, preselectedClient, clients = [] }: PaymentSheetProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency(); // kept for cancel/contract flows
  const { enabledGateways } = usePaymentGateway();
  const { createPayment: createPaymentHook, updatePayment: updatePaymentHook } = useCreatePayment();
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [manualOverrideDialogOpen, setManualOverrideDialogOpen] = useState(false);
  const [manualOverrideConfirmed, setManualOverrideConfirmed] = useState(false);
  const [updateContract, setUpdateContract] = useState(false);
  const [deactivateClient, setDeactivateClient] = useState(false);

  const [clientId, setClientId] = useState("");
  const [baseValue, setBaseValue] = useState(0);
  const [additions, setAdditions] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [description, setDescription] = useState("");
  const [billingType, setBillingType] = useState("manual");
  const totalAmount = useMemo(() => {
    return Math.max(0, baseValue + additions - discounts);
  }, [baseValue, additions, discounts]);

  const resolvedClient = useMemo(() => {
    if (preselectedClient) return preselectedClient;
    if (clientId) return clients.find(c => c.id === clientId) || null;
    return null;
  }, [preselectedClient, clientId, clients]);

  useEffect(() => {
    if (!open) return;

    if (payment) {
      const client = clients.find(c => c.id === payment.client_id);
      const contractBase = client?.monthly_value || 0;
      const diff = (payment.amount || 0) - contractBase;

      setClientId(payment.client_id || "");
      setBaseValue(contractBase);
      setAdditions(diff > 0 ? diff : 0);
      setDiscounts(diff < 0 ? Math.abs(diff) : 0);
      setDueDate(payment.due_date ? payment.due_date.split("T")[0] : "");
      setPaidDate(payment.paid_date ? payment.paid_date.split("T")[0] : "");
      setStatus(payment.status || "pending");
      setDescription(payment.description || "");
      const paymentBt = payment.billing_type || client?.default_billing_type || 'manual';
      setBillingType(enabledGateways.includes(paymentBt) ? paymentBt : 'manual');
    } else if (preselectedClient) {
      const now = new Date();
      const defaultDue = new Date(now.getFullYear(), now.getMonth(), 15);
      const clientBt = (preselectedClient as any).default_billing_type || 'manual';
      setClientId(preselectedClient.id);
      setBaseValue(preselectedClient.monthly_value || 0);
      setAdditions(0);
      setDiscounts(0);
      setDueDate(defaultDue.toISOString().split("T")[0]);
      setPaidDate("");
      setStatus("pending");
      setDescription("");
      setBillingType(enabledGateways.includes(clientBt) ? clientBt : 'manual');
    } else {
      setClientId("");
      setBaseValue(0);
      setAdditions(0);
      setDiscounts(0);
      setDueDate("");
      setPaidDate("");
      setStatus("pending");
      setDescription("");
      setBillingType("manual");
    }
    setUpdateContract(false);
    setDeactivateClient(false);
    setManualOverrideConfirmed(false);
  }, [open, payment, preselectedClient, clients, enabledGateways]);

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find(c => c.id === id);
    if (client?.monthly_value) {
      setBaseValue(client.monthly_value);
    }
    const clientBt = client?.default_billing_type || 'manual';
    setBillingType(enabledGateways.includes(clientBt) ? clientBt : 'manual');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (payment) {
        const success = await updatePaymentHook({
          id: payment.id,
          client_id: clientId,
          amount: totalAmount,
          due_date: dueDate,
          paid_date: paidDate || null,
          status: status as "pending" | "paid" | "overdue",
          description: description || null,
          billing_type: billingType,
        });
        if (!success) { setLoading(false); return; }
      } else {
        const result = await createPaymentHook({
          client_id: clientId,
          amount: totalAmount,
          due_date: dueDate,
          paid_date: paidDate || null,
          status: status as "pending" | "paid" | "overdue",
          description: description || null,
          billing_type: billingType,
        });
        if (!result) { setLoading(false); return; }
      }

      if (updateContract && totalAmount !== baseValue) {
        const { error: contractError } = await supabase
          .from("clients")
          .update({ monthly_value: totalAmount })
          .eq("id", clientId);
        if (contractError) throw contractError;
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!payment) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("client_payments")
        .update({ status: "cancelled" as any })
        .eq("id", payment.id);
      if (error) throw error;
      if (deactivateClient && clientId) {
        const { error: clientError } = await supabase
          .from("clients")
          .update({ active: false })
          .eq("id", clientId);
        if (clientError) throw clientError;
      }

      toast({ title: "Cobrança cancelada", description: deactivateClient ? "Cobrança cancelada e cliente inativado." : "Esta cobrança foi perdoada e não será mais contabilizada." });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setCancelDialogOpen(false);
    }
  };

  const handleWhatsApp = () => {
    toast({ title: "Em breve", description: "Integração com WhatsApp para cobrança será disponibilizada em breve." });
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;
  const isEditing = !!payment;
  const showWhatsApp = (status === "pending" || status === "overdue") && isEditing;
  const hasAsaasCharge = !!payment?.asaas_payment_id;
  const hasConexaCharge = !!payment?.conexa_charge_id;
  const isGatewayActive = billingType !== 'manual';
  const gatewayName = billingType === 'asaas' ? 'Asaas' : billingType === 'conexa' ? 'Conexa' : 'Manual';

  const handleGenerateAsaasCharge = () => {
    toast({ title: "Em breve", description: "A geração de cobranças via Asaas será disponibilizada em breve." });
  };

  const handleGenerateConexaCharge = () => {
    toast({ title: "Em breve", description: "A geração de cobranças via Conexa será disponibilizada em breve." });
  };

  const handleCopyPaymentLink = (source: 'asaas' | 'conexa' = 'asaas') => {
    const link = source === 'conexa'
      ? (payment?.conexa_invoice_url || payment?.conexa_pix_copy_paste)
      : (payment?.invoice_url || payment?.pix_copy_paste);
    if (link) {
      navigator.clipboard.writeText(link);
      toast({ title: "Link copiado!", description: "O link de pagamento foi copiado para a área de transferência." });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-2">
              <SheetTitle>{isEditing ? "Fatura do Mês" : "Nova Fatura"}</SheetTitle>
              {isEditing && <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>}
            </div>
            {resolvedClient && (
              <SheetDescription>{resolvedClient.name}</SheetDescription>
            )}
          </SheetHeader>

          {clients.length === 0 && !preselectedClient ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Gateway sync warning */}
              {isEditing && (hasAsaasCharge || hasConexaCharge) && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                    Aviso: Alterar o valor ou vencimento atualizará automaticamente o boleto no seu gateway de pagamento ({hasAsaasCharge ? 'Asaas' : 'Conexa'}).
                  </AlertDescription>
                </Alert>
              )}
              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente *</Label>
                {preselectedClient || isEditing ? (
                  <Input value={resolvedClient?.name || ""} disabled className="bg-muted" />
                ) : (
                  <Select value={clientId} onValueChange={handleClientChange} required>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.filter(c => c.active).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Valor Base */}
              <div className="space-y-2">
                <Label>Valor Base do Contrato</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baseValue}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Valor mensal do contrato mestre (somente leitura)</p>
              </div>

              {/* Acréscimos e Descontos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Acréscimos / Multa</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additions}
                    onChange={e => setAdditions(Number(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descontos</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discounts}
                    onChange={e => setDiscounts(Number(e.target.value) || 0)}
                    placeholder="0,00"
                  />
                </div>
              </div>

              {/* Total calculado */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground mb-1">Valor Total da Fatura</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                {(additions > 0 || discounts > 0) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Base R$ {baseValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {additions > 0 && ` + R$ ${additions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    {discounts > 0 && ` - R$ ${discounts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                )}
              </div>

              {/* Método de Faturamento */}
              <div className="space-y-2">
                <Label>Método de Faturamento</Label>
                <Select value={billingType} onValueChange={setBillingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {enabledGateways.map((gw) => (
                      <SelectItem key={gw} value={gw}>
                        {gw === 'manual' ? 'Manual' : gw === 'asaas' ? 'Asaas' : 'Conexa'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upsell/Downsell Switch */}
              {totalAmount !== baseValue && (
                <TooltipProvider>
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Label htmlFor="update-contract" className="text-sm font-medium cursor-pointer">
                            Tornar este o novo valor fixo mensal
                          </Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[260px]">
                              <p>Ao ativar, o valor base mensal do cliente será atualizado permanentemente. As faturas dos próximos meses serão geradas com este novo valor.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-xs text-muted-foreground">Atualiza o contrato do cliente para os próximos meses</p>
                      </div>
                    </div>
                    <Switch
                      id="update-contract"
                      checked={updateContract}
                      onCheckedChange={setUpdateContract}
                    />
                  </div>
                </TooltipProvider>
              )}

              {/* Datas e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vencimento *</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="overdue">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {status === "paid" && (
                <div className="space-y-2">
                  <Label>Data de Pagamento</Label>
                  <Input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)} />
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações da Fatura</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Justifique acréscimos, descontos ou observações gerais..."
                  rows={3}
                />
              </div>

              {/* Financial Transparency — Paid Payment Details */}
              {isEditing && status === 'paid' && payment && (
                (payment.gateway_fee > 0 || (payment.amount_paid && payment.amount_paid !== payment.amount)) && (
                  <div className="rounded-lg border bg-muted/50 p-3 space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Detalhes do Recebimento</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">Valor Original:</span>
                      <span className="text-right font-medium">R$ {(payment.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      {payment.amount_paid && payment.amount_paid !== payment.amount && (
                        <>
                          <span className="text-muted-foreground">Valor Pago:</span>
                          <span className="text-right font-medium text-green-600">R$ {payment.amount_paid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </>
                      )}
                      {payment.gateway_fee > 0 && (
                        <>
                          <span className="text-muted-foreground">Taxa do Gateway:</span>
                          <span className="text-right font-medium text-destructive">- R$ {payment.gateway_fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </>
                      )}
                    {payment.gateway_fee > 0 && (
                        <>
                          <span className="text-muted-foreground font-medium">Líquido:</span>
                          <span className="text-right font-bold text-primary">
                            R$ {((payment.amount_paid || payment.amount) - (payment.gateway_fee || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </>
                      )}
                    </div>
                    {/* Contextual diff: interest/fine or discount */}
                    {payment.amount_paid && payment.amount_paid > payment.amount && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        + R$ {(payment.amount_paid - payment.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recebidos em juros/multa
                      </p>
                    )}
                    {payment.amount_paid && payment.amount_paid < payment.amount && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        - R$ {(payment.amount - payment.amount_paid).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} concedidos em desconto
                      </p>
                    )}
                  </div>
                )
              )}

              {/* Asaas Section */}
              {billingType === 'asaas' && isEditing && (
                <div className="space-y-2">
                  {hasAsaasCharge ? (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="warning" className="text-xs">Aguardando Pagamento (Asaas)</Badge>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleCopyPaymentLink('asaas')} className="w-full">
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Link de Pagamento
                      </Button>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handleGenerateAsaasCharge}
                              className="w-full"
                              disabled={!resolvedClient?.document || !resolvedClient?.zip_code}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Gerar Cobrança (Asaas)
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!resolvedClient?.document || !resolvedClient?.zip_code) && (
                          <TooltipContent side="top" className="max-w-[280px]">
                            <p>Dados de faturamento incompletos. Preencha o CPF/CNPJ e CEP do cliente para emitir cobranças oficiais.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}

              {/* Conexa Section */}
              {billingType === 'conexa' && isEditing && (
                <div className="space-y-2">
                  {hasConexaCharge ? (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="warning" className="text-xs">Aguardando Pagamento (Conexa)</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleCopyPaymentLink('conexa')} className="flex-1">
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar Link (Conexa)
                        </Button>
                        {payment?.conexa_pix_copy_paste && (
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(payment.conexa_pix_copy_paste);
                            toast({ title: "PIX copiado!" });
                          }} className="flex-1">
                            <QrCode className="h-4 w-4 mr-1" />
                            Copiar PIX
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="w-full">
                            <Button
                              type="button"
                              variant="default"
                              onClick={handleGenerateConexaCharge}
                              className="w-full"
                              disabled={!resolvedClient?.document || !resolvedClient?.zip_code}
                            >
                              <QrCode className="h-4 w-4 mr-1" />
                              Gerar Cobrança (Conexa)
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {(!resolvedClient?.document || !resolvedClient?.zip_code) && (
                          <TooltipContent side="top" className="max-w-[280px]">
                            <p>Dados de faturamento incompletos. Preencha o CPF/CNPJ e CEP do cliente para emitir cobranças oficiais.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              )}

              {/* Gateway auto-settlement banner */}
              {isGatewayActive && !manualOverrideConfirmed && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-3 flex items-center justify-between">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    ⚡ Baixa automática habilitada via {gatewayName}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setManualOverrideDialogOpen(true)}>
                        Forçar Baixa Manual (Override)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4 border-t">
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {showWhatsApp && (
                  <Button type="button" variant="outline" onClick={handleWhatsApp} className="w-full">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Enviar Cobrança via WhatsApp
                  </Button>
                )}

                {isEditing && status !== "cancelled" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCancelDialogOpen(true)}
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Ban className="h-4 w-4 mr-1" />
                    Cancelar Cobrança
                  </Button>
                )}
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Cobrança</AlertDialogTitle>
            <AlertDialogDescription>
              {hasAsaasCharge || hasConexaCharge
                ? `Tem certeza que deseja cancelar esta cobrança? O boleto será cancelado no gateway (${hasAsaasCharge ? 'Asaas' : 'Conexa'}) e o cliente não poderá mais pagá-lo. O registro será mantido no histórico.`
                : 'Deseja realmente cancelar e perdoar esta cobrança? O cliente não será mais cobrado por este mês. O registro será mantido no histórico.'}
            </AlertDialogDescription>
            <TooltipProvider>
              <div className="flex items-start gap-2 mt-3 rounded-lg border p-3">
                <Checkbox
                  id="deactivate-client"
                  checked={deactivateClient}
                  onCheckedChange={(v) => setDeactivateClient(v === true)}
                />
                <div className="grid gap-0.5 leading-none">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="deactivate-client" className="text-sm font-medium cursor-pointer">
                      Também inativar este cliente (Pausar contrato)
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px]">
                        <p>O cliente será marcado como inativo e novas cobranças não serão geradas nos próximos meses.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">Impede geração automática de futuras faturas</p>
                </div>
              </div>
            </TooltipProvider>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelPayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Override AlertDialog */}
      <AlertDialog open={manualOverrideDialogOpen} onOpenChange={setManualOverrideDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forçar Baixa Manual</AlertDialogTitle>
            <AlertDialogDescription>
              Atenção: esta ação apenas atualiza o status no Orbity localmente. Ela <strong>não cancela</strong> a cobrança no {gatewayName}. O cliente ainda poderá receber notificações de cobrança do {gatewayName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setManualOverrideConfirmed(true)}>
              Entendi, prosseguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
