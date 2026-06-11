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
import { Sparkles, Loader2, ArrowLeft, ChevronDown } from "lucide-react";
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

  const SectionHeader = ({ label }: { label: string }) => (
    <div className="flex items-center justify-between w-full text-sm font-medium">
      <span>{label}</span>
      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar conteudos com IA
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Quanto mais contexto voce der, melhores os conteudos gerados."
              : `${generatedItems.length} conteudos gerados. Selecione os que deseja adicionar.`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-2">
              {/* Basico */}
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

                <div className="space-y-2">
                  <Label>Data de inicio</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Dias da semana permitidos</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => {
                      const active = weekdays.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleFromList(weekdays, setWeekdays, d.value)}
                          className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                            active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
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

              {/* Briefing estrategico */}
              <Collapsible open={briefingOpen} onOpenChange={setBriefingOpen} className="border rounded-md">
                <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 rounded-md">
                  <SectionHeader label="Briefing estrategico (recomendado)" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Tema / foco desta leva</Label>
                    <Textarea
                      value={focus}
                      onChange={(e) => setFocus(e.target.value)}
                      placeholder="Ex: campanha de Black Friday, lancamento do curso X, autoridade em nutricao..."
                      rows={2}
                    />
                  </div>

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

                  <div className="space-y-2">
                    <Label>Pilares de conteudo (separe por virgula)</Label>
                    <Input
                      value={pillarsInput}
                      onChange={(e) => setPillarsInput(e.target.value)}
                      placeholder="Ex: bastidores, dicas, prova social, ofertas"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Formatos e mix */}
              <Collapsible open={formatsOpen} onOpenChange={setFormatsOpen} className="border rounded-md">
                <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 rounded-md">
                  <SectionHeader label="Formatos e mix" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Formatos desejados</Label>
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
                  </div>

                  <div className="space-y-2">
                    <Label>Distribuicao sugerida (texto livre)</Label>
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
                </CollapsibleContent>
              </Collapsible>

              {/* Restricoes */}
              <Collapsible open={restrictionsOpen} onOpenChange={setRestrictionsOpen} className="border rounded-md">
                <CollapsibleTrigger className="w-full p-3 hover:bg-muted/50 rounded-md">
                  <SectionHeader label="Restricoes e referencias" />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-3 pb-3 space-y-3">
                  <div className="space-y-2">
                    <Label>Evitar (temas / palavras / abordagens)</Label>
                    <Textarea
                      value={avoid}
                      onChange={(e) => setAvoid(e.target.value)}
                      placeholder="Ex: nao falar de concorrente X, evitar promessas medicas"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Referencias / concorrentes</Label>
                    <Textarea
                      value={references}
                      onChange={(e) => setReferences(e.target.value)}
                      placeholder="Ex: estilo do perfil @exemplo, conteudo similar a marca Y"
                      rows={2}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        )}

        {step === "preview" && (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2">
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
          </ScrollArea>
        )}

        <DialogFooter className="gap-2">
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
