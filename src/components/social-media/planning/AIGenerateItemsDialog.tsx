import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, ArrowLeft } from "lucide-react";
import { ContentPlan, useContentPlanning, AIPlanResult } from "@/hooks/useContentPlanning";

interface AIGenerateItemsDialogProps {
  plan: ContentPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube"];

export function AIGenerateItemsDialog({ plan, open, onOpenChange }: AIGenerateItemsDialogProps) {
  const { generateItemsForPlan, appendItemsToPlan, generating } = useContentPlanning();
  const [itemsCount, setItemsCount] = useState(4);
  const [focus, setFocus] = useState("");
  const [periodDays, setPeriodDays] = useState(30);
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
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
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const togglePlatform = (p: string) => {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const handleGenerate = async () => {
    if (!plan || platforms.length === 0) return;
    const items = await generateItemsForPlan(plan, {
      itemsCount,
      focus,
      periodDays,
      platforms,
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar conteudos com IA
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "A IA vai criar novos conteudos e adicionar a este planejamento."
              : `${generatedItems.length} conteudos gerados. Selecione os que deseja adicionar.`}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4 overflow-y-auto">
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tema / foco estrategico (opcional)</Label>
              <Textarea
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Ex: campanha de Black Friday, lancamento de produto, autoridade no nicho..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Se vazio, a IA usa o contexto estrategico do planejamento.
              </p>
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
                      onCheckedChange={() => togglePlatform(p)}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>
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
            <Button onClick={handleGenerate} disabled={generating || platforms.length === 0}>
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
