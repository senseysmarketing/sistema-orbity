import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Loader2, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { ContentPlan, useContentPlanning, AIPlanResult } from "@/hooks/useContentPlanning";

interface AIGenerateItemsDialogProps {
  plan: ContentPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube"];
const FORMATS = ["Reels", "Carrossel", "Story", "Imagem unica", "Video longo", "Live"];
const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
];
const OBJECTIVES = [
  "Autoridade",
  "Engajamento",
  "Vendas / Conversao",
  "Educacional",
  "Lancamento",
  "Institucional",
  "Misto",
];
const TONES = ["Profissional", "Descontraido", "Inspirador", "Tecnico", "Divertido", "Outro"];

export function AIGenerateItemsDialog({ plan, open, onOpenChange }: AIGenerateItemsDialogProps) {
  const { generateItemsForPlan, appendItemsToPlan, generating } = useContentPlanning();

  // Basico
  const [itemsCount, setItemsCount] = useState(4);
  const [periodDays, setPeriodDays] = useState(30);
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Briefing estrategico
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [focus, setFocus] = useState("");
  const [objective, setObjective] = useState<string>("");
  const [tone, setTone] = useState<string>("");
  const [toneCustom, setToneCustom] = useState("");
  const [audience, setAudience] = useState("");
  const [pillarsInput, setPillarsInput] = useState("");

  // Formatos e mix
  const [formatsOpen, setFormatsOpen] = useState(false);
  const [formats, setFormats] = useState<string[]>([]);
  const [mixDistribution, setMixDistribution] = useState("");
  const [allowSalesCta, setAllowSalesCta] = useState(true);

  // Restricoes
  const [restrictionsOpen, setRestrictionsOpen] = useState(false);
  const [avoid, setAvoid] = useState("");
  const [references, setReferences] = useState("");

  // Preview
  const [step, setStep] = useState<"form" | "preview">("form");
  const [generatedItems, setGeneratedItems] = useState<AIPlanResult["items"]>([]);
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep("form");
    setGeneratedItems([]);
    setSelectedIdx(new Set());
    setFocus("");
    setItemsCount(4);
    setPeriodDays(30);
    setPlatforms(["Instagram"]);
    setStartDate(new Date().toISOString().substring(0, 10));
    setWeekdays([1, 2, 3, 4, 5]);
    setObjective("");
    setTone("");
    setToneCustom("");
    setAudience("");
    setPillarsInput("");
    setFormats([]);
    setMixDistribution("");
    setAllowSalesCta(true);
    setAvoid("");
    setReferences("");
    setBriefingOpen(true);
    setFormatsOpen(false);
    setRestrictionsOpen(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const toggleFromList = <T,>(list: T[], setList: (v: T[]) => void, v: T) => {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const handleGenerate = async () => {
    if (!plan || platforms.length === 0 || weekdays.length === 0) return;
    const pillars = pillarsInput.split(",").map((p) => p.trim()).filter(Boolean);
    const items = await generateItemsForPlan(plan, {
      itemsCount,
      focus,
      periodDays,
      platforms,
      formats,
      startDate,
      weekdays,
      objective: objective || undefined,
      tone: tone || undefined,
      toneCustom: tone === "Outro" ? toneCustom : undefined,
      audience: audience || undefined,
      pillars,
      mixDistribution: mixDistribution || undefined,
      allowSalesCta,
      avoid: avoid || undefined,
      references: references || undefined,
    });
    if (items && items.length > 0) {
      setGeneratedItems(items);
      setSelectedIdx(new Set(items.map((_, i) => i)));
      setStep("preview");
    }
  };

  const handleConfirm = async () => {
    if (!plan) return;
    const chosen = generatedItems.filter((_, i) => selectedIdx.has(i));
    if (chosen.length === 0) return;
    setSaving(true);
    const ok = await appendItemsToPlan(plan.id, chosen);
    setSaving(false);
    if (ok) {
      reset();
      onOpenChange(false);
    }
  };

  const toggleItem = (i: number) => {
    setSelectedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const Section = ({
    label,
    hint,
    open: sectionOpen,
    onToggle,
    children,
  }: {
    label: string;
    hint?: string;
    open: boolean;
    onToggle: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <Collapsible open={sectionOpen} onOpenChange={onToggle} className="border rounded-md">
      <CollapsibleTrigger type="button" className="w-full p-3 hover:bg-muted/50 rounded-md text-left">
        <div className="flex items-center justify-between w-full gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">{label}</p>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          {sectionOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3 pt-1 space-y-3">{children}</CollapsibleContent>
    </Collapsible>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar conteudos com IA
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Quanto mais contexto, melhor o resultado."
              : `${generatedItems.length} conteudos gerados. Selecione os que deseja adicionar.`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="space-y-4 py-2 pb-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={itemsCount}
                      onChange={(e) => setItemsCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distribuir nos proximos</Label>
                    <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="14">14 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="60">60 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de inicio</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dias permitidos</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d) => {
                        const active = weekdays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => toggleFromList(weekdays, setWeekdays, d.value)}
                            className={`px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                              active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Plataformas</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => (
                      <label
                        key={p}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                          platforms.includes(p) ? "bg-primary/10 border-primary text-primary" : "bg-background"
                        }`}
                      >
                        <Checkbox
                          checked={platforms.includes(p)}
                          onCheckedChange={() => toggleFromList(platforms, setPlatforms, p)}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <Section
                label="Briefing"
                hint="Tema, objetivo, tom, publico e pilares de conteudo."
                open={briefingOpen}
                onToggle={setBriefingOpen}
              >
                <Textarea
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Tema desta leva. Ex: campanha de Black Friday, lancamento do curso X..."
                  rows={2}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Objetivo principal</Label>
                    <Select value={objective} onValueChange={setObjective}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {OBJECTIVES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tom de voz</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {tone === "Outro" && (
                  <Input
                    value={toneCustom}
                    onChange={(e) => setToneCustom(e.target.value)}
                    placeholder="Descreva o tom desejado"
                  />
                )}

                <div className="space-y-2">
                  <Label>Publico-alvo</Label>
                  <Textarea
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Ex: donas de clinica de estetica, 30-45 anos, no interior de SP"
                    rows={2}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Pilares</Label>
                  <Input
                    value={pillarsInput}
                    onChange={(e) => setPillarsInput(e.target.value)}
                    placeholder="Ex: bastidores, dicas, prova social, ofertas"
                  />
                  <p className="text-xs text-muted-foreground">Separe por virgula.</p>
                </div>
              </Section>

              <Section
                label="Formatos"
                hint="Tipos de post desejados, mix por categoria e CTAs comerciais."
                open={formatsOpen}
                onToggle={setFormatsOpen}
              >
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((f) => (
                    <label
                      key={f}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                        formats.includes(f) ? "bg-primary/10 border-primary text-primary" : "bg-background"
                      }`}
                    >
                      <Checkbox
                        checked={formats.includes(f)}
                        onCheckedChange={() => toggleFromList(formats, setFormats, f)}
                      />
                      {f}
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Mix sugerido</Label>
                  <Input
                    value={mixDistribution}
                    onChange={(e) => setMixDistribution(e.target.value)}
                    placeholder="Ex: 60% educativo, 30% vendas, 10% bastidores"
                  />
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-0.5">
                    <Label>Permitir CTAs de venda direta</Label>
                    <p className="text-xs text-muted-foreground">
                      Quando desligado, a IA evita posts puramente comerciais.
                    </p>
                  </div>
                  <Switch checked={allowSalesCta} onCheckedChange={setAllowSalesCta} />
                </div>
              </Section>

              <Section
                label="Restricoes"
                hint="O que evitar e referencias de estilo."
                open={restrictionsOpen}
                onToggle={setRestrictionsOpen}
              >
                <div className="space-y-2">
                  <Label>O que evitar</Label>
                  <Textarea
                    value={avoid}
                    onChange={(e) => setAvoid(e.target.value)}
                    placeholder="Ex: nao falar de concorrente X, evitar promessas medicas"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referencias</Label>
                  <Textarea
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    placeholder="Ex: estilo do perfil @exemplo, conteudo similar a marca Y"
                    rows={2}
                  />
                </div>
              </Section>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6">
            <div className="space-y-2 py-2 pb-4">
              {generatedItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-md border flex items-start gap-3 cursor-pointer transition-colors ${
                    selectedIdx.has(i) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => toggleItem(i)}
                >
                  <Checkbox checked={selectedIdx.has(i)} onCheckedChange={() => toggleItem(i)} className="mt-1" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.format && <Badge variant="secondary" className="text-[10px]">{item.format}</Badge>}
                      {item.platform && <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>}
                      {item.post_date && <Badge variant="outline" className="text-[10px]">{item.post_date}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 px-6 pb-6 pt-2 border-t">
          {step === "preview" && (
            <Button variant="outline" onClick={() => setStep("form")} disabled={saving}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={() => handleClose(false)} disabled={generating || saving}>
            Cancelar
          </Button>
          {step === "form" ? (
            <Button
              onClick={handleGenerate}
              disabled={generating || platforms.length === 0 || weekdays.length === 0}
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Gerar
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={saving || selectedIdx.size === 0}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Adicionar {selectedIdx.size > 0 ? `(${selectedIdx.size})` : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
