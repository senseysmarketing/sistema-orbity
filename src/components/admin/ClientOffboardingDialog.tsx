import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, UserX, Trash2, Pin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Client, ClientPayment } from "@/hooks/useFinancialMetrics";

interface ClientOffboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onConfirmed?: () => void;
}

type Decision = "cancel" | "keep";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function formatMonthBadge(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return dateStr;
  return `${MONTH_LABELS[m - 1]}/${String(y).slice(-2)}`;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function ClientOffboardingDialog({
  open,
  onOpenChange,
  client,
  onConfirmed,
}: ClientOffboardingDialogProps) {
  const { toast } = useToast();
  const [pendingPayments, setPendingPayments] = useState<ClientPayment[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !client?.id) return;
    let cancelled = false;
    (async () => {
      setLoadingFetch(true);
      try {
        const { data, error } = await supabase
          .from("client_payments")
          .select("*")
          .eq("client_id", client.id)
          .eq("status", "pending")
          .order("due_date", { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        const list = (data || []) as ClientPayment[];
        setPendingPayments(list);
        const initial: Record<string, Decision> = {};
        list.forEach((p) => { initial[p.id] = "cancel"; });
        setDecisions(initial);
      } catch (err: any) {
        if (!cancelled) {
          toast({
            title: "Erro ao carregar cobranças pendentes",
            description: err.message,
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingFetch(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, client?.id, toast]);

  useEffect(() => {
    if (!open) {
      setPendingPayments([]);
      setDecisions({});
      setSubmitting(false);
    }
  }, [open]);

  const hasExternalGateway = useMemo(() => {
    if (!client) return false;
    const c = client as any;
    const clientHasGateway = !!(
      c.asaas_customer_id ||
      c.conexa_customer_id ||
      c.stripe_customer_id ||
      (c.default_billing_type && c.default_billing_type !== "manual")
    );
    const paymentHasGateway = pendingPayments.some((p: any) =>
      p.asaas_charge_id || p.conexa_charge_id || p.stripe_invoice_id ||
      (p.billing_type && p.billing_type !== "manual")
    );
    return clientHasGateway || paymentHasGateway;
  }, [client, pendingPayments]);

  const cancelCount = useMemo(
    () => Object.values(decisions).filter((d) => d === "cancel").length,
    [decisions]
  );
  const keepCount = pendingPayments.length - cancelCount;

  const setAll = (decision: Decision) => {
    const next: Record<string, Decision> = {};
    pendingPayments.forEach((p) => { next[p.id] = decision; });
    setDecisions(next);
  };

  const handleConfirm = async () => {
    if (!client) return;
    setSubmitting(true);
    try {
      const toCancel = pendingPayments.filter((p) => decisions[p.id] === "cancel");
      const stamp = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

      for (const p of toCancel) {
        const noteSuffix = `Cancelado via Offboarding em ${stamp}`;
        const newDescription = p.description
          ? `${p.description}\n[${noteSuffix}]`
          : `[${noteSuffix}]`;
        const { error: cancelErr } = await supabase
          .from("client_payments")
          .update({ status: "cancelled" as any, description: newDescription })
          .eq("id", p.id);
        if (cancelErr) throw cancelErr;
      }

      const { error: deactErr } = await supabase
        .from("clients")
        .update({ active: false, cancelled_at: new Date().toISOString() })
        .eq("id", client.id);
      if (deactErr) throw deactErr;

      toast({
        title: "Cliente desativado",
        description: pendingPayments.length === 0
          ? `${client.name} foi desativado.`
          : `${client.name} desativado. ${toCancel.length} cobrança(s) cancelada(s), ${pendingPayments.length - toCancel.length} mantida(s).`,
      });

      onConfirmed?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao desativar cliente",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserX className="h-5 w-5 text-muted-foreground" />
            Desativar cliente
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Você está prestes a desativar <strong className="text-foreground">{client.name}</strong>.
            O cliente será removido do MRR projetado. O histórico de pagamentos já realizados permanece intacto.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-4">
            {hasExternalGateway && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção: integrações de pagamento ativas</AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  Este cliente possui integrações de pagamento ativas (Asaas / Stripe / Conexa).
                  Cancelar cobranças aqui <strong>não cancela assinaturas automáticas no gateway</strong>.
                  Lembre-se de suspender a assinatura diretamente no gateway para evitar cobranças indevidas.
                </AlertDescription>
              </Alert>
            )}

            {loadingFetch ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma cobrança pendente para este cliente.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  A desativação prosseguirá diretamente.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {pendingPayments.length} cobrança{pendingPayments.length > 1 ? "s" : ""} pendente{pendingPayments.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decida o que fazer com cada uma antes de desativar.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => setAll("cancel")} className="h-7 text-xs">
                      Cancelar todas
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setAll("keep")} className="h-7 text-xs">
                      Manter todas
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {pendingPayments.map((p) => {
                    const decision = decisions[p.id] || "cancel";
                    return (
                      <div
                        key={p.id}
                        className="rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px] font-medium">
                                {formatMonthBadge(p.due_date)}
                              </Badge>
                              <span className="text-sm font-semibold">
                                {formatCurrency(p.amount)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                vence {formatDateBR(p.due_date)}
                              </span>
                            </div>
                            {p.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <RadioGroup
                          value={decision}
                          onValueChange={(v) => setDecisions((prev) => ({ ...prev, [p.id]: v as Decision }))}
                          className="mt-3 flex items-center gap-1.5"
                        >
                          <Label
                            htmlFor={`cancel-${p.id}`}
                            className={`flex-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                              decision === "cancel"
                                ? "border-destructive/40 bg-destructive/5 text-foreground"
                                : "border-border/50 text-muted-foreground hover:bg-muted/30"
                            }`}
                          >
                            <RadioGroupItem id={`cancel-${p.id}`} value="cancel" className="h-3.5 w-3.5" />
                            <Trash2 className="h-3.5 w-3.5" />
                            Cancelar cobrança
                          </Label>
                          <Label
                            htmlFor={`keep-${p.id}`}
                            className={`flex-1 flex items-center gap-2 rounded-md border px-3 py-2 text-xs cursor-pointer transition-colors ${
                              decision === "keep"
                                ? "border-primary/40 bg-primary/5 text-foreground"
                                : "border-border/50 text-muted-foreground hover:bg-muted/30"
                            }`}
                          >
                            <RadioGroupItem id={`keep-${p.id}`} value="keep" className="h-3.5 w-3.5" />
                            <Pin className="h-3.5 w-3.5" />
                            Manter cobrança
                          </Label>
                        </RadioGroup>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Trash2 className="h-3 w-3" /> {cancelCount} a cancelar
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Pin className="h-3 w-3" /> {keepCount} a manter
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={submitting || loadingFetch}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar desativação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
