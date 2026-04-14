import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { useCreatePayment } from "@/hooks/useCreatePayment";
import { usePaymentGateway } from "@/hooks/usePaymentGateway";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FirstPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export function FirstPaymentDialog({ isOpen, onClose, client }: FirstPaymentDialogProps) {
  const { createPayment, loading } = useCreatePayment();
  const { enabledGateways, settings: gatewaySettings } = usePaymentGateway();

  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [billingType, setBillingType] = useState("manual");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [syncDueDate, setSyncDueDate] = useState(false);
  const [dateWasAdjusted, setDateWasAdjusted] = useState(false);

  // Calculate initial due date based on client's due_date (day) for current month
  const { suggestedDate, isRetroactive } = useMemo(() => {
    if (!client?.due_date) return { suggestedDate: new Date(), isRetroactive: false };
    const now = new Date();
    const day = Math.min(client.due_date, 28);
    const suggested = new Date(now.getFullYear(), now.getMonth(), day);
    const retro = suggested < now;
    return { suggestedDate: retro ? now : suggested, isRetroactive: retro };
  }, [client?.due_date]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen && client) {
      setAmount(client.monthly_value || 0);
      const currentMonth = format(new Date(), "MMMM", { locale: ptBR });
      setDescription(`Mensalidade - ${currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}`);
      const clientBt = client.default_billing_type || "manual";
      setBillingType(enabledGateways.includes(clientBt) ? clientBt : "manual");
      setDueDate(suggestedDate);
      setSyncDueDate(isRetroactive);
      setDateWasAdjusted(false);
    }
  }, [isOpen, client, suggestedDate, isRetroactive, enabledGateways]);

  const handleDateChange = (date: Date | undefined) => {
    setDueDate(date);
    if (date) {
      const originalDay = client?.due_date || 5;
      const newDay = date.getDate();
      if (newDay !== originalDay) {
        setDateWasAdjusted(true);
        setSyncDueDate(true);
      }
    }
  };

  // Pre-flight check: gateway requires document + zip_code
  const needsPreFlight = billingType !== "manual";
  const missingDocument = needsPreFlight && !client?.document;
  const missingZipCode = needsPreFlight && !client?.zip_code;
  const preFlightBlocked = missingDocument || missingZipCode;

  // Value validation
  const isValueInvalid = !amount || amount <= 0;

  const handleSubmit = async () => {
    if (!client || !dueDate || isValueInvalid || preFlightBlocked) return;

    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

    const result = await createPayment({
      client_id: client.id,
      amount,
      due_date: dueDateStr,
      description: description || null,
      billing_type: billingType,
    });

    if (result && syncDueDate) {
      const newDay = dueDate.getDate();
      await supabase.from("clients").update({ due_date: newDay }).eq("id", client.id);
    }

    if (result) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <DialogTitle>Gerar Primeira Cobrança</DialogTitle>
          </div>
          <DialogDescription>
            Cliente <span className="font-medium text-foreground">{client?.name}</span> cadastrado com sucesso. Deseja lançar o primeiro pagamento?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Retroactive date warning */}
          {isRetroactive && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
                O dia de vencimento padrão deste cliente (dia {client?.due_date}) já passou neste mês. Gateways não aceitam datas retroativas. Ajuste a data para o primeiro pagamento.
              </AlertDescription>
            </Alert>
          )}

          {/* Pre-flight block */}
          {preFlightBlocked && (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-300 text-xs">
                Para emitir via {billingType === "asaas" ? "Asaas" : "Conexa"}, o cliente precisa ter{" "}
                {missingDocument && "CPF/CNPJ"}
                {missingDocument && missingZipCode && " e "}
                {missingZipCode && "CEP"} cadastrados. Edite o cliente ou altere para "Manual".
              </AlertDescription>
            </Alert>
          )}

          {/* Valor */}
          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="0,00"
            />
            {isValueInvalid && amount !== 0 && (
              <p className="text-xs text-destructive">O valor deve ser maior que zero.</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mensalidade - Mês"
            />
          </div>

          {/* Método de Faturamento */}
          <div className="space-y-2">
            <Label>Método de Faturamento</Label>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledGateways.map((gw) => (
                  <SelectItem key={gw} value={gw}>
                    {gw === "manual" ? "Manual" : gw === "asaas" ? "Asaas" : "Conexa"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label>Data de Vencimento *</Label>
            <DatePickerDemo
              date={dueDate}
              onDateChange={handleDateChange}
              placeholder="Selecione a data de vencimento"
            />
          </div>

          {/* Sync checkbox */}
          {dateWasAdjusted && (
            <div className="flex items-start space-x-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Checkbox
                id="sync-due-date"
                checked={syncDueDate}
                onCheckedChange={(checked) => setSyncDueDate(!!checked)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="sync-due-date" className="text-sm cursor-pointer">
                  Definir o dia {dueDate?.getDate()} como novo vencimento padrão do cliente
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Futuras cobranças serão geradas no dia {dueDate?.getDate()} de cada mês.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Fazer depois
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || isValueInvalid || !dueDate || preFlightBlocked}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Gerar Cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
