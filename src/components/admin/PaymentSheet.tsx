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
import { Ban, HelpCircle, MessageSquare, Save, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const [clientId, setClientId] = useState("");
  const [baseValue, setBaseValue] = useState(0);
  const [additions, setAdditions] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [status, setStatus] = useState("pending");
  const [description, setDescription] = useState("");

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
    } else if (preselectedClient) {
      const now = new Date();
      const defaultDue = new Date(now.getFullYear(), now.getMonth(), 15);
      setClientId(preselectedClient.id);
      setBaseValue(preselectedClient.monthly_value || 0);
      setAdditions(0);
      setDiscounts(0);
      setDueDate(defaultDue.toISOString().split("T")[0]);
      setPaidDate("");
      setStatus("pending");
      setDescription("");
    } else {
      setClientId("");
      setBaseValue(0);
      setAdditions(0);
      setDiscounts(0);
      setDueDate("");
      setPaidDate("");
      setStatus("pending");
      setDescription("");
    }
  }, [open, payment, preselectedClient, clients]);

  const handleClientChange = (id: string) => {
    setClientId(id);
    const client = clients.find(c => c.id === id);
    if (client?.monthly_value) {
      setBaseValue(client.monthly_value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !dueDate) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = {
        client_id: clientId,
        amount: totalAmount,
        due_date: dueDate,
        paid_date: paidDate || null,
        status: status as "pending" | "paid" | "overdue",
        description: description || null,
        agency_id: currentAgency?.id,
      };

      if (payment) {
        const { error } = await supabase.from("client_payments").update(data).eq("id", payment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_payments").insert([data]);
        if (error) throw error;
      }

      toast({ title: payment ? "Fatura atualizada" : "Fatura criada", description: "Salvo com sucesso!" });
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
      toast({ title: "Cobrança cancelada", description: "Esta cobrança foi perdoada e não será mais contabilizada." });
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
              Deseja realmente cancelar e perdoar esta cobrança? O cliente não será mais cobrado por este mês. O registro será mantido no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelPayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
