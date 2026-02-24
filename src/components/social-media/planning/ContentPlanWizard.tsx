import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { WizardStepIndicator } from "@/components/ui/wizard-step-indicator";
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { WizardData } from "@/hooks/useContentPlanning";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";

interface ContentPlanWizardProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (data: WizardData) => void;
  generating: boolean;
}

const OBJECTIVES = [
  { value: "leads", label: "Geração de Leads" },
  { value: "conversion", label: "Conversão" },
  { value: "engagement", label: "Engajamento" },
  { value: "authority", label: "Autoridade" },
  { value: "launch", label: "Lançamento" },
  { value: "branding", label: "Branding" },
];

const CONTENT_TYPES = [
  { value: "educativo", label: "Educativo" },
  { value: "informativo", label: "Informativo" },
  { value: "autoridade", label: "Autoridade" },
  { value: "prova_social", label: "Prova Social" },
  { value: "bastidores", label: "Bastidores" },
  { value: "conversao", label: "Conversão Direta" },
  { value: "trend", label: "Trend" },
  { value: "objecoes", label: "Objeções" },
  { value: "storytelling", label: "Storytelling" },
  { value: "tutorial", label: "Tutorial" },
];

const FORMATS = [
  { value: "carrossel", label: "Carrossel" },
  { value: "feed", label: "Feed Estático" },
  { value: "reels", label: "Reels" },
  { value: "stories", label: "Stories" },
];

const VOICE_TONES = [
  { value: "profissional", label: "Profissional" },
  { value: "descontraido", label: "Descontraído" },
  { value: "tecnico", label: "Técnico" },
  { value: "inspirador", label: "Inspirador" },
  { value: "vendedor", label: "Vendedor" },
  { value: "humanizado", label: "Humanizado" },
];

const STEP_LABELS = ["Contexto", "Frequência", "Estilo", "Direcionamento", "IA"];

export function ContentPlanWizard({ open, onClose, onGenerate, generating }: ContentPlanWizardProps) {
  const { currentAgency } = useAgency();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    clientId: "",
    clientName: "",
    niche: "",
    objectives: [],
    strategicFocus: "",
    postsPerWeek: 3,
    storiesPerWeek: 5,
    includeReels: true,
    includeInteractive: false,
    includeHolidays: true,
    period: "next_month",
    contentTypes: ["educativo", "autoridade", "conversao"],
    formats: ["carrossel", "feed", "reels"],
    voiceTone: "profissional",
    priorityProduct: "",
    activeOffer: "",
    hasLaunch: false,
    hasAds: false,
    targetAudience: "",
    audiencePains: "",
    depthLevel: "detailed",
    assignedUserIds: [],
  });

  const { data: agencyUsers = [] } = useQuery({
    queryKey: ["agency-users-planning", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select("id, user_id, role, profiles:user_id(name)")
        .eq("agency_id", currentAgency.id);
      return (data || []).map((u: any) => ({
        id: u.id,
        user_id: u.user_id,
        name: u.profiles?.name || "Sem nome",
        role: u.role,
      }));
    },
    enabled: !!currentAgency?.id && open,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-planning-wizard", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("clients")
        .select("id, name, service, observations")
        .eq("agency_id", currentAgency.id)
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: !!currentAgency?.id && open,
  });

  const updateField = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: "objectives" | "contentTypes" | "formats", value: string) => {
    setData((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  };

  const handleClientChange = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    updateField("clientId", clientId);
    updateField("clientName", client?.name || "");
    if (client?.service) updateField("niche", client.service);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!data.clientId && data.objectives.length > 0;
      case 1: return data.postsPerWeek > 0;
      case 2: return data.contentTypes.length > 0 && data.formats.length > 0;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  };

  const handleGenerate = () => {
    onGenerate(data);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={data.clientId} onValueChange={handleClientChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nicho / Segmento</Label>
              <Input value={data.niche} onChange={(e) => updateField("niche", e.target.value)} placeholder="Ex: Odontologia, E-commerce de moda..." />
            </div>

            <div className="space-y-2">
              <Label>Objetivo principal do mês *</Label>
              <div className="flex flex-wrap gap-2">
                {OBJECTIVES.map((obj) => (
                  <Badge
                    key={obj.value}
                    variant={data.objectives.includes(obj.value) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleArrayItem("objectives", obj.value)}
                  >
                    {obj.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Foco estratégico do mês</Label>
              <Textarea
                value={data.strategicFocus}
                onChange={(e) => updateField("strategicFocus", e.target.value)}
                placeholder="Ex: Vamos focar em vender mentoria premium e posicionar como autoridade..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Responsáveis pelas tarefas</Label>
              <p className="text-xs text-muted-foreground">Selecione quem será atribuído às tarefas criadas a partir deste planejamento</p>
              <MultiUserSelector
                users={agencyUsers}
                selectedUserIds={data.assignedUserIds || []}
                onSelectionChange={(ids) => updateField("assignedUserIds", ids)}
                placeholder="Selecionar responsáveis..."
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Posts por semana</Label>
                <Input type="number" min={1} max={14} value={data.postsPerWeek} onChange={(e) => updateField("postsPerWeek", parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Stories por semana</Label>
                <Input type="number" min={0} max={21} value={data.storiesPerWeek} onChange={(e) => updateField("storiesPerWeek", parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Incluir Reels?</Label>
                <Switch checked={data.includeReels} onCheckedChange={(v) => updateField("includeReels", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Incluir conteúdo interativo?</Label>
                <Switch checked={data.includeInteractive} onCheckedChange={(v) => updateField("includeInteractive", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Incluir datas comemorativas?</Label>
                <Switch checked={data.includeHolidays} onCheckedChange={(v) => updateField("includeHolidays", v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={data.period} onValueChange={(v) => updateField("period", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Este mês</SelectItem>
                  <SelectItem value="next_month">Próximo mês</SelectItem>
                  <SelectItem value="custom">Intervalo personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.period === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data início</Label>
                  <Input type="date" value={data.customStartDate || ""} onChange={(e) => updateField("customStartDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Data fim</Label>
                  <Input type="date" value={data.customEndDate || ""} onChange={(e) => updateField("customEndDate", e.target.value)} />
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipos de conteúdo *</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((ct) => (
                  <Badge
                    key={ct.value}
                    variant={data.contentTypes.includes(ct.value) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleArrayItem("contentTypes", ct.value)}
                  >
                    {ct.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Formatos preferidos *</Label>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <Badge
                    key={f.value}
                    variant={data.formats.includes(f.value) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1.5 px-3"
                    onClick={() => toggleArrayItem("formats", f.value)}
                  >
                    {f.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tom de voz</Label>
              <Select value={data.voiceTone} onValueChange={(v) => updateField("voiceTone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICE_TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Produto/Serviço prioritário</Label>
              <Input value={data.priorityProduct} onChange={(e) => updateField("priorityProduct", e.target.value)} placeholder="Ex: Mentoria Premium, Curso Online..." />
            </div>

            <div className="space-y-2">
              <Label>Oferta ativa</Label>
              <Input value={data.activeOffer} onChange={(e) => updateField("activeOffer", e.target.value)} placeholder="Ex: 30% de desconto, bônus exclusivo..." />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Existe lançamento nesse período?</Label>
                <Switch checked={data.hasLaunch} onCheckedChange={(v) => updateField("hasLaunch", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Existe campanha paga rodando?</Label>
                <Switch checked={data.hasAds} onCheckedChange={(v) => updateField("hasAds", v)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Público-alvo principal</Label>
              <Input value={data.targetAudience} onChange={(e) => updateField("targetAudience", e.target.value)} placeholder="Ex: Mulheres 25-40, empreendedores..." />
            </div>

            <div className="space-y-2">
              <Label>Principais dores do público</Label>
              <Textarea value={data.audiencePains} onChange={(e) => updateField("audiencePains", e.target.value)} placeholder="Ex: Falta de tempo, não sabe como começar..." rows={3} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold">Nível de profundidade</Label>

              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.depthLevel === "summary" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                onClick={() => updateField("depthLevel", "summary")}
              >
                <p className="font-medium">📋 Planejamento Resumido</p>
                <p className="text-sm text-muted-foreground mt-1">Roteiro resumido de cada conteúdo — ideal para apresentação ao cliente</p>
              </div>

              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${data.depthLevel === "detailed" ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"}`}
                onClick={() => updateField("depthLevel", "detailed")}
              >
                <p className="font-medium">📝 Planejamento Completo</p>
                <p className="text-sm text-muted-foreground mt-1">Estrutura completa com instruções criativas, pronto para virar tarefa no sistema</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <p className="text-sm font-medium">Resumo do planejamento:</p>
              <p className="text-sm text-muted-foreground">
                <strong>{data.clientName}</strong> — {data.postsPerWeek} posts/sem + {data.storiesPerWeek} stories/sem
                {data.includeReels && " + Reels"}
              </p>
              <p className="text-sm text-muted-foreground">
                Objetivos: {data.objectives.map((o) => OBJECTIVES.find((obj) => obj.value === o)?.label).join(", ")}
              </p>
              <p className="text-sm text-muted-foreground">
                Tom: {VOICE_TONES.find((t) => t.value === data.voiceTone)?.label}
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Novo Planejamento com IA
          </DialogTitle>
        </DialogHeader>

        <WizardStepIndicator currentStep={step + 1} totalSteps={5} stepLabels={STEP_LABELS} />

        <ScrollArea className="flex-1 px-1">
          <div className="py-4">{renderStep()}</div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => (step > 0 ? setStep(step - 1) : onClose())} disabled={generating}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {step < STEP_LABELS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={generating || !canProceed()}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando planejamento...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar com IA
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
