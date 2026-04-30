import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertTriangle, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { CashFlowItem } from "@/hooks/useFinancialMetrics";

type TemplateKey = "asaas" | "conexa" | "pix" | "generic";

const DEFAULT_TEMPLATES: Record<TemplateKey, string> = {
  asaas:
    "Olá {{nome_cliente}}, passando para lembrar que sua fatura no valor de {{valor_formatado}} vence em {{data_vencimento}}. Segue o link para pagamento via Asaas:\n{{link_fatura}}",
  conexa:
    "Olá {{nome_cliente}}, sua fatura de {{valor_formatado}} está disponível. Vencimento: {{data_vencimento}}.\nLink para pagamento: {{link_fatura}}",
  pix:
    "Olá {{nome_cliente}}, segue lembrete da sua cobrança de {{valor_formatado}} com vencimento em {{data_vencimento}}. Para pagar via PIX, me avise por aqui que envio a chave.",
  generic:
    "Olá {{nome_cliente}}, lembrete da fatura no valor de {{valor_formatado}} com vencimento em {{data_vencimento}}.{{#link}}\nLink para pagamento: {{link_fatura}}{{/link}}",
};

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  asaas: "Asaas",
  conexa: "Conexa",
  pix: "PIX Manual",
  generic: "Genérico",
};

// Guardrail 1: parse manual de YYYY-MM-DD (sem timezone shift)
function formatDueDate(dueDate: string): string {
  const [year, month, day] = dueDate.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

// Guardrail 2: parse robusto do bloco condicional {{#link}}...{{/link}}
function renderTemplate(tpl: string, vars: Record<string, string>, hasLink: boolean): string {
  let out = hasLink
    ? tpl.replace(/\{\{#link\}\}/g, "").replace(/\{\{\/link\}\}/g, "")
    : tpl.replace(/\{\{#link\}\}[\s\S]*?\{\{\/link\}\}/g, "");
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

// Faz a "des-renderização" — converte valores resolvidos de volta em tokens
function detokenize(content: string, vars: Record<string, string>): string {
  let out = content;
  // Ordem importa: substituir os mais específicos/longos primeiro reduz colisões
  if (vars.link_fatura) out = out.split(vars.link_fatura).join("{{link_fatura}}");
  if (vars.valor_formatado) out = out.split(vars.valor_formatado).join("{{valor_formatado}}");
  if (vars.data_vencimento) out = out.split(vars.data_vencimento).join("{{data_vencimento}}");
  if (vars.nome_cliente) out = out.split(vars.nome_cliente).join("{{nome_cliente}}");
  return out;
}

function detectInitialTemplate(item: CashFlowItem): TemplateKey {
  const bt = (item.billingType || "").toLowerCase();
  if (bt === "asaas") return "asaas";
  if (bt === "conexa") return "conexa";
  if (!item.invoiceUrl && (bt === "manual" || bt === "")) return "pix";
  return "generic";
}

interface ManualBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CashFlowItem | null;
  agencyId: string;
}

export function ManualBillingDialog({ open, onOpenChange, item, agencyId }: ManualBillingDialogProps) {
  const [selectedTpl, setSelectedTpl] = useState<TemplateKey>("generic");
  const [message, setMessage] = useState("");
  const [isEdited, setIsEdited] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<"loading" | "ready" | "missing">("loading");

  // Cache local dos templates customizados da agência (key -> content cru)
  const customTemplatesRef = useRef<Partial<Record<TemplateKey, string>>>({});
  const [customKeys, setCustomKeys] = useState<Set<TemplateKey>>(new Set());

  const variables = useMemo(() => {
    if (!item) return null;
    return {
      nome_cliente: item.title || "Cliente",
      valor_formatado: formatCurrency(item.amount),
      data_vencimento: formatDueDate(item.dueDate),
      link_fatura: item.invoiceUrl || "",
    };
  }, [item]);

  const hasInvoiceLink = !!item?.invoiceUrl;

  // Carrega todos os customs da agência ao abrir
  useEffect(() => {
    if (!open || !agencyId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("agency_billing_templates")
        .select("template_key, content")
        .eq("agency_id", agencyId);
      if (cancelled) return;
      const map: Partial<Record<TemplateKey, string>> = {};
      const keys = new Set<TemplateKey>();
      (data || []).forEach((row: any) => {
        const k = row.template_key as TemplateKey;
        map[k] = row.content;
        keys.add(k);
      });
      customTemplatesRef.current = map;
      setCustomKeys(keys);
    })();
    return () => { cancelled = true; };
  }, [open, agencyId]);

  // Reset & inicialização ao abrir / mudar item
  useEffect(() => {
    if (!open || !item || !variables) return;
    const initial = detectInitialTemplate(item);
    setSelectedTpl(initial);
    const base = customTemplatesRef.current[initial] ?? DEFAULT_TEMPLATES[initial];
    setMessage(renderTemplate(base, variables, hasInvoiceLink));
    setIsEdited(false);
  }, [open, item, variables, hasInvoiceLink, customKeys]);

  // Lookup da conta WhatsApp (billing → fallback general)
  useEffect(() => {
    if (!open || !agencyId) return;
    let cancelled = false;
    setAccountStatus("loading");
    setAccountId(null);

    (async () => {
      const { data: billing } = await supabase
        .from("whatsapp_accounts")
        .select("id, status, purpose")
        .eq("agency_id", agencyId)
        .eq("purpose", "billing")
        .eq("status", "connected")
        .maybeSingle();

      if (cancelled) return;
      if (billing?.id) {
        setAccountId(billing.id);
        setAccountStatus("ready");
        return;
      }

      const { data: general } = await supabase
        .from("whatsapp_accounts")
        .select("id, status, purpose")
        .eq("agency_id", agencyId)
        .eq("purpose", "general")
        .eq("status", "connected")
        .maybeSingle();

      if (cancelled) return;
      if (general?.id) {
        setAccountId(general.id);
        setAccountStatus("ready");
      } else {
        setAccountStatus("missing");
      }
    })();

    return () => { cancelled = true; };
  }, [open, agencyId]);

  // Guardrail 3: confirmação ao trocar template se houver edição manual
  const handleTemplateChange = (newTpl: TemplateKey) => {
    if (!variables) return;
    if (newTpl === selectedTpl) return;
    if (isEdited) {
      const ok = window.confirm(
        "Você fez alterações manuais na mensagem. Deseja substituí-la pelo novo modelo?"
      );
      if (!ok) return;
    }
    const base = customTemplatesRef.current[newTpl] ?? DEFAULT_TEMPLATES[newTpl];
    setMessage(renderTemplate(base, variables, hasInvoiceLink));
    setSelectedTpl(newTpl);
    setIsEdited(false);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    setIsEdited(true);
  };

  const handleSaveTemplate = async () => {
    if (!variables || !agencyId) return;
    setIsSaving(true);
    try {
      const rawContent = detokenize(message, variables);
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("agency_billing_templates")
        .upsert(
          {
            agency_id: agencyId,
            template_key: selectedTpl,
            content: rawContent,
            updated_by: user?.id ?? null,
          },
          { onConflict: "agency_id,template_key" }
        );
      if (error) throw error;

      customTemplatesRef.current[selectedTpl] = rawContent;
      setCustomKeys((prev) => new Set(prev).add(selectedTpl));
      setIsEdited(false);
      toast.success(`Modelo "${TEMPLATE_LABELS[selectedTpl]}" salvo para futuros envios.`);
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível salvar o modelo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!variables || !agencyId) return;
    const ok = window.confirm(
      `Restaurar o modelo "${TEMPLATE_LABELS[selectedTpl]}" para o padrão? A versão personalizada será removida.`
    );
    if (!ok) return;
    try {
      const { error } = await supabase
        .from("agency_billing_templates")
        .delete()
        .eq("agency_id", agencyId)
        .eq("template_key", selectedTpl);
      if (error) throw error;

      delete customTemplatesRef.current[selectedTpl];
      setCustomKeys((prev) => {
        const next = new Set(prev);
        next.delete(selectedTpl);
        return next;
      });
      setMessage(renderTemplate(DEFAULT_TEMPLATES[selectedTpl], variables, hasInvoiceLink));
      setIsEdited(false);
      toast.success("Modelo padrão restaurado.");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível restaurar o padrão.");
    }
  };

  const handleSend = async () => {
    if (!item || !accountId) return;

    // Guardrail 4: higienização do telefone
    const cleanPhone = (item.clientPhone ?? "").replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Telefone do cliente inválido ou ausente.");
      return;
    }
    if (!message.trim()) {
      toast.error("A mensagem está vazia.");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: {
          account_id: accountId,
          phone_number: cleanPhone,
          message,
        },
      });
      if (error) throw new Error(error.message);
      if (data && data.success === false) throw new Error(data.error || "Falha no envio");

      toast.success(`Cobrança enviada com sucesso para ${item.title}`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar cobrança via WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  if (!item) return null;

  const phoneMissing = !((item.clientPhone ?? "").replace(/\D/g, "").length >= 10);
  const canSend = !isSending && !phoneMissing && accountStatus === "ready" && message.trim().length > 0;
  const isCurrentCustom = customKeys.has(selectedTpl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Cobrança Manual</DialogTitle>
          <DialogDescription>
            Mensagem para <span className="font-medium text-foreground">{item.title}</span> — vencimento {formatDueDate(item.dueDate)} • {formatCurrency(item.amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {phoneMissing && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>Este cliente não possui telefone cadastrado. Atualize o cadastro para enviar a cobrança.</div>
            </div>
          )}

          {accountStatus === "missing" && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>Nenhuma instância do WhatsApp conectada. Configure em Ajustes → Integrações → WhatsApp.</div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Modelo</Label>
              {isCurrentCustom && (
                <Badge variant="secondary" className="text-[10px] h-5">Personalizado</Badge>
              )}
            </div>
            <Select value={selectedTpl} onValueChange={(v) => handleTemplateChange(v as TemplateKey)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {TEMPLATE_LABELS[k]}
                    {customKeys.has(k) && <span className="ml-2 text-[10px] text-muted-foreground">(personalizado)</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Mensagem</Label>
            <Textarea
              value={message}
              onChange={handleMessageChange}
              rows={10}
              className="resize-none font-mono text-sm leading-relaxed"
              placeholder="Digite ou ajuste a mensagem antes de enviar..."
            />
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">
                Variáveis: <code>{"{{nome_cliente}}"}</code>, <code>{"{{valor_formatado}}"}</code>, <code>{"{{data_vencimento}}"}</code>, <code>{"{{link_fatura}}"}</code>
              </p>
              {isCurrentCustom && (
                <button
                  type="button"
                  onClick={handleRestoreDefault}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline inline-flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurar padrão
                </button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleSaveTemplate}
            disabled={!isEdited || isSaving || isSending}
            title={isEdited ? "Salvar como modelo padrão da agência" : "Edite a mensagem para habilitar"}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar modelo
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={!canSend}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              {isSending ? "Enviando..." : "Enviar via WhatsApp"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
