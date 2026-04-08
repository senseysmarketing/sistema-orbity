import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Save,
  Trash2,
  FileText,
  Loader2,
  Wand2,
} from "lucide-react";

interface SmartContractGeneratorProps {
  onCancel: () => void;
  onComplete: () => void;
}

interface ClientOption {
  id: string;
  name: string;
  contact: string | null;
  monthly_value: number | null;
}

export default function SmartContractGenerator({
  onCancel,
  onComplete,
}: SmartContractGeneratorProps) {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const isMobile = useIsMobile();

  const [clientMode, setClientMode] = useState<'registered' | 'manual'>('registered');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [manualClientName, setManualClientName] = useState("");
  const [manualClientDocument, setManualClientDocument] = useState("");
  const [manualClientContact, setManualClientContact] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");
  const [penaltyPercent, setPenaltyPercent] = useState("20");
  const [customInstructions, setCustomInstructions] = useState("");
  const [contractContent, setContractContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    if (!currentAgency?.id) return;
    const fetchClients = async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name, contact, monthly_value")
        .eq("agency_id", currentAgency.id)
        .eq("active", true)
        .order("name");
      setClients(data || []);
      setLoadingClients(false);
    };
    fetchClients();
  }, [currentAgency?.id]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  useEffect(() => {
    if (selectedClient?.monthly_value) {
      setMonthlyValue(String(selectedClient.monthly_value));
    }
  }, [selectedClientId]);

  const handleGenerate = async () => {
    if (!selectedClient) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!monthlyValue || Number(monthlyValue) <= 0) {
      toast.error("Informe o valor mensal");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        client_name: selectedClient.name,
        client_contact: selectedClient.contact || "",
        agency_name: currentAgency?.name || "",
        monthly_value: Number(monthlyValue),
        duration_months: Number(durationMonths),
        penalty_percent: Number(penaltyPercent),
        custom_instructions: customInstructions,
      };

      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: {
          type: "generate_contract",
          content: JSON.stringify(payload),
          agency_id: currentAgency?.id,
        },
      });

      if (error) {
        const msg = error.message || "";
        if (msg.includes("429")) {
          toast.error("Limite de requisições. Tente novamente em alguns segundos.");
        } else if (msg.includes("402")) {
          toast.error("Créditos de IA esgotados.");
        } else {
          toast.error("Erro ao gerar contrato. Tente novamente.");
        }
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const text = data?.result?.contract_text;
      if (text) {
        setContractContent(text);
        toast.success("Contrato gerado com sucesso!");
      } else {
        toast.error("Resposta inesperada da IA.");
      }
    } catch (e) {
      console.error("Contract generation error:", e);
      toast.error("Falha ao conectar com a IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!contractContent.trim()) {
      toast.error("O contrato está vazio.");
      return;
    }
    if (!currentAgency?.id || !profile?.user_id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from("contracts").insert({
        agency_id: currentAgency.id,
        agency_name: currentAgency.name,
        client_id: selectedClientId || null,
        client_name: selectedClient?.name || "Cliente",
        total_value: Number(monthlyValue) || 0,
        contract_date: new Date().toISOString().split("T")[0],
        start_date: new Date().toISOString().split("T")[0],
        status: "draft",
        custom_clauses: contractContent,
        services: [],
        created_by: profile.user_id,
      });

      if (error) throw error;

      toast.success("Contrato salvo como rascunho!");
      onComplete();
    } catch (e) {
      console.error("Save contract error:", e);
      toast.error("Erro ao salvar contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  const copilotPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Copilot de Contrato
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os dados e deixe a IA redigir
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingClients ? "Carregando..." : "Selecione o cliente"}
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor Mensal (R$)</Label>
            <Input
              type="number"
              placeholder="2500"
              value={monthlyValue}
              onChange={(e) => setMonthlyValue(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Duração (Meses)</Label>
              <Input
                type="number"
                placeholder="12"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Multa Rescisória (%)</Label>
              <Input
                type="number"
                placeholder="20"
                value={penaltyPercent}
                onChange={(e) => setPenaltyPercent(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instruções Específicas para a IA</Label>
            <Textarea
              placeholder="Ex: Adicione uma cláusula exigindo aviso prévio de 30 dias. Mencione que custos de Meta Ads são por conta do cliente..."
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedClientId}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando contrato...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </div>
      </ScrollArea>
    </div>
  );

  const editorPanel = (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <span className="text-sm font-medium text-muted-foreground">
          Editor de Contrato
        </span>
        <div className="flex items-center gap-2">
          {contractContent && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setContractContent("");
                  toast.info("Contrato limpo.");
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Limpar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1 h-3.5 w-3.5" />
                )}
                Salvar Contrato
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {contractContent ? (
        <div className="flex-1 overflow-auto bg-muted/20 p-4 md:p-8">
          <div className="max-w-[800px] mx-auto bg-background shadow-lg rounded-lg border">
            <Textarea
              value={contractContent}
              onChange={(e) => setContractContent(e.target.value)}
              className="min-h-[600px] w-full border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none p-8 md:p-12 text-sm leading-relaxed font-mono"
              style={{ minHeight: "calc(100vh - 200px)" }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Seu contrato aparecerá aqui</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure as opções à esquerda e clique em "Gerar com IA" para
                redigir o contrato automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">{copilotPanel}</Card>
        <Card className="overflow-hidden min-h-[400px]">{editorPanel}</Card>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={38} minSize={25}>
          {copilotPanel}
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={62} minSize={35}>
          {editorPanel}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
