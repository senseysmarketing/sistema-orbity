import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Info, ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  onCancel: () => void;
  onComplete: () => void;
}

interface ClientRow {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  contact: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  monthly_value: number | null;
}

interface TemplateRow {
  id: string;
  name: string;
  content: string;
}

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatAddress = (c: ClientRow | null): string => {
  if (!c) return "";
  const parts = [
    c.street,
    c.number,
    c.complement,
    c.neighborhood,
    c.city,
    c.state,
    c.zip_code,
  ].filter(Boolean);
  return parts.join(", ");
};

export default function TemplateContractWizard({ onCancel, onComplete }: Props) {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1
  const [clientMode, setClientMode] = useState<"registered" | "manual">("registered");
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualDocument, setManualDocument] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [loadingData, setLoadingData] = useState(true);

  // Step 2
  const [monthlyValue, setMonthlyValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agencyDoc, setAgencyDoc] = useState("");

  // Step 3
  const [contractContent, setContractContent] = useState("");
  const [saving, setSaving] = useState(false);

  const localStorageKey = useMemo(
    () => (currentAgency?.id ? `orbity_agency_doc_${currentAgency.id}` : ""),
    [currentAgency?.id]
  );

  useEffect(() => {
    if (!currentAgency?.id) return;
    (async () => {
      setLoadingData(true);
      const [c, t] = await Promise.all([
        supabase
          .from("clients")
          .select(
            "id, name, document, email, contact, street, number, complement, neighborhood, city, state, zip_code, monthly_value"
          )
          .eq("agency_id", currentAgency.id)
          .eq("active", true)
          .order("name"),
        supabase
          .from("contract_templates")
          .select("id, name, content")
          .eq("agency_id", currentAgency.id)
          .order("name"),
      ]);
      setClients((c.data as ClientRow[]) || []);
      setTemplates(t.data || []);
      setLoadingData(false);
    })();

    if (localStorageKey) {
      setAgencyDoc(localStorage.getItem(localStorageKey) || "");
    }
  }, [currentAgency?.id, localStorageKey]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || null,
    [clients, selectedClientId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  // Auto-fill monthly value from client
  useEffect(() => {
    if (selectedClient?.monthly_value && !monthlyValue) {
      setMonthlyValue(String(selectedClient.monthly_value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient]);

  const validateStep1 = () => {
    if (!selectedTemplateId) {
      toast.error("Selecione um modelo");
      return false;
    }
    if (clientMode === "registered" && !selectedClientId) {
      toast.error("Selecione um cliente");
      return false;
    }
    if (clientMode === "manual" && !manualName.trim()) {
      toast.error("Informe o nome do cliente");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const v = parseFloat(monthlyValue);
    if (!v || v <= 0) {
      toast.error("Informe um valor mensal válido");
      return false;
    }
    if (!startDate) {
      toast.error("Informe a data de início");
      return false;
    }
    return true;
  };

  const composeContract = () => {
    if (!selectedTemplate || !currentAgency) return "";

    const clientName =
      clientMode === "registered" ? selectedClient?.name || "" : manualName;
    const clientDocument =
      clientMode === "registered"
        ? selectedClient?.document || ""
        : manualDocument;
    const clientEmail =
      clientMode === "registered" ? selectedClient?.email || "" : manualEmail;
    const clientPhone =
      clientMode === "registered" ? selectedClient?.contact || "" : manualPhone;
    const clientAddress =
      clientMode === "registered" ? formatAddress(selectedClient) : manualAddress;

    const map: Record<string, string> = {
      "{{CLIENT_NAME}}": clientName || "—",
      "{{CLIENT_DOCUMENT}}": clientDocument || "—",
      "{{CLIENT_ADDRESS}}": clientAddress || "—",
      "{{CLIENT_EMAIL}}": clientEmail || "—",
      "{{CLIENT_PHONE}}": clientPhone || "—",
      "{{CONTRACT_VALUE}}": formatBRL(parseFloat(monthlyValue) || 0),
      "{{START_DATE}}": startDate
        ? format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy")
        : "—",
      "{{END_DATE}}": endDate
        ? format(new Date(endDate + "T00:00:00"), "dd/MM/yyyy")
        : "Indeterminado",
      "{{AGENCY_NAME}}": currentAgency.name,
      "{{AGENCY_DOCUMENT}}": agencyDoc || "—",
    };

    let out = selectedTemplate.content;
    Object.entries(map).forEach(([k, v]) => {
      out = out.split(k).join(v);
    });
    return out;
  };

  const goNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      if (!validateStep2()) return;
      // persist agency doc
      if (localStorageKey && agencyDoc.trim()) {
        localStorage.setItem(localStorageKey, agencyDoc.trim());
      }
      setContractContent(composeContract());
      setStep(3);
    }
  };

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const handleSave = async () => {
    if (!currentAgency?.id || !profile?.user_id) return;
    setSaving(true);

    const clientName =
      clientMode === "registered" ? selectedClient?.name || "" : manualName;
    const clientDocument =
      clientMode === "registered"
        ? selectedClient?.document || null
        : manualDocument || null;
    const clientEmail =
      clientMode === "registered"
        ? selectedClient?.email || null
        : manualEmail || null;
    const clientPhone =
      clientMode === "registered"
        ? selectedClient?.contact || null
        : manualPhone || null;
    const clientAddress =
      clientMode === "registered"
        ? formatAddress(selectedClient) || null
        : manualAddress || null;

    const { error } = await supabase.from("contracts").insert({
      agency_id: currentAgency.id,
      agency_name: currentAgency.name,
      agency_cnpj: agencyDoc || null,
      client_id: clientMode === "registered" ? selectedClientId : null,
      client_name: clientName,
      client_cpf_cnpj: clientDocument,
      client_email: clientEmail,
      client_phone: clientPhone,
      client_address: clientAddress,
      total_value: parseFloat(monthlyValue),
      contract_date: format(new Date(), "yyyy-MM-dd"),
      start_date: startDate,
      end_date: endDate || null,
      custom_clauses: contractContent,
      services: [],
      status: "draft",
      created_by: profile.user_id,
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar contrato", { description: error.message });
      return;
    }
    toast.success("Contrato salvo");
    onComplete();
  };

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Passo {step} de 3 —{" "}
            {step === 1 ? "Base" : step === 2 ? "Variáveis do Contrato" : "Revisão Final"}
          </p>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {loadingData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6 border border-border/60 rounded-md p-6">
              <div className="space-y-3">
                <Label>Origem do Cliente</Label>
                <ToggleGroup
                  type="single"
                  value={clientMode}
                  onValueChange={(v) => v && setClientMode(v as any)}
                  variant="outline"
                  className="justify-start"
                >
                  <ToggleGroupItem value="registered">
                    Cliente cadastrado
                  </ToggleGroupItem>
                  <ToggleGroupItem value="manual">Manual</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {clientMode === "registered" ? (
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger className="border-border/60">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          Nenhum cliente ativo.
                        </div>
                      ) : (
                        clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Documento (CPF/CNPJ)</Label>
                    <Input
                      value={manualDocument}
                      onChange={(e) => setManualDocument(e.target.value)}
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="border-border/60"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Endereço</Label>
                    <Input
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="Rua, número, bairro, cidade, estado"
                      className="border-border/60"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Modelo de Contrato</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger className="border-border/60">
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <div className="px-2 py-3 text-sm text-muted-foreground">
                        Nenhum modelo cadastrado. Crie um na aba "Modelos".
                      </div>
                    ) : (
                      templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6 border border-border/60 rounded-md p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor Mensal (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    className="border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Término</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-border/60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Documento da Agência (CNPJ/NIF) — Opcional</Label>
                <Input
                  value={agencyDoc}
                  onChange={(e) => setAgencyDoc(e.target.value)}
                  placeholder="Ex: 00.000.000/0001-00"
                  className="border-border/60"
                />
                <p className="text-xs text-muted-foreground">
                  Salvo no seu navegador para os próximos contratos.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <Alert variant="default" className="border-border/60">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Reveja os dados abaixo. Variáveis sem informação no CRM foram
                  preenchidas com{" "}
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">
                    —
                  </code>
                  . Substitua antes de salvar.
                </AlertDescription>
              </Alert>

              <Textarea
                value={contractContent}
                onChange={(e) => setContractContent(e.target.value)}
                className="min-h-[600px] font-serif text-[15px] leading-7 whitespace-pre-wrap p-6 bg-background border-border/60"
                style={{ tabSize: 2 }}
              />
            </div>
          )}

          {/* Footer actions */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={step === 1 ? onCancel : goBack}
              disabled={saving}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 1 ? "Cancelar" : "Voltar"}
            </Button>

            {step < 3 ? (
              <Button onClick={goNext}>
                Avançar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Contrato
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
