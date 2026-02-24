import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPlanItem } from "@/hooks/useContentPlanning";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface ContentPlanItemEditDialogProps {
  item: ContentPlanItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (itemId: string, updates: Partial<ContentPlanItem>) => Promise<boolean>;
  planItems?: ContentPlanItem[];
  planStrategy?: string;
}

const FORMATS = ["carrossel", "feed", "reels", "stories", "vídeo", "artigo"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Twitter/X"];

function normalizePlatform(value: string | null | undefined): string {
  if (!value) return "";
  const found = PLATFORMS.find((p) => p.toLowerCase() === value.toLowerCase());
  return found || "";
}

export function ContentPlanItemEditDialog({ item, open, onClose, onSave, planItems, planStrategy }: ContentPlanItemEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [postDate, setPostDate] = useState<Date | undefined>();
  const [formatVal, setFormatVal] = useState("");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [creativeInstructions, setCreativeInstructions] = useState("");
  const [objective, setObjective] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAIInput, setShowAIInput] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { toast } = useToast();
  const { currentAgency } = useAgency();

  const isNew = item?.id === "__new__";

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setPostDate(item.post_date ? new Date(item.post_date + "T12:00:00") : undefined);
      setFormatVal(item.format || "");
      setPlatform(normalizePlatform(item.platform));
      setContentType(item.content_type || "");
      setCreativeInstructions(item.creative_instructions || "");
      setObjective(item.objective || "");
      setHashtags(item.hashtags || "");
    }
    setShowAIInput(false);
    setAiDirection("");
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    const success = await onSave(item.id, {
      title,
      description: description || null,
      post_date: postDate ? format(postDate, "yyyy-MM-dd") : null,
      format: formatVal || null,
      platform: platform || null,
      content_type: contentType || null,
      creative_instructions: creativeInstructions || null,
      objective: objective || null,
      hashtags: hashtags || null,
    });
    setSaving(false);
    if (success) onClose();
  };

  const handleAIGenerate = async () => {
    setAiLoading(true);
    try {
      const otherItems = (planItems || [])
        .filter((i) => i.id !== item?.id)
        .map((i) => `- ${i.title} (${i.format || "sem formato"}, ${i.platform || "sem plataforma"})`)
        .join("\n");

      const currentItemContext = !isNew && title
        ? `\n\nConteúdo atual para melhorar:\nTítulo: ${title}\nDescrição: ${description}\nFormato: ${formatVal}\nPlataforma: ${platform}\nTipo: ${contentType}\nObjetivo: ${objective}\nInstruções criativas: ${creativeInstructions}\nHashtags: ${hashtags}`
        : "";

      const content = [
        planStrategy ? `Estratégia do plano: ${planStrategy}` : "",
        otherItems ? `Outros conteúdos já planejados:\n${otherItems}` : "",
        currentItemContext,
        aiDirection ? `\nDirecionamento do usuário: ${aiDirection}` : "",
        isNew ? "\nCrie um conteúdo NOVO e original." : "\nMelhore o conteúdo existente mantendo o propósito.",
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { type: "edit_plan_item", content, agency_id: currentAgency?.id },
      });

      if (error || data?.error) {
        toast({ title: "Erro na IA", description: data?.error || "Não foi possível gerar o conteúdo.", variant: "destructive" });
        return;
      }

      const result = data?.result;
      if (result) {
        if (result.title) setTitle(result.title);
        if (result.description) setDescription(result.description);
        if (result.format) setFormatVal(result.format);
        if (result.platform) setPlatform(normalizePlatform(result.platform));
        if (result.content_type) setContentType(result.content_type);
        if (result.creative_instructions) setCreativeInstructions(result.creative_instructions);
        if (result.objective) setObjective(result.objective);
        if (result.hashtags) setHashtags(result.hashtags);
        setShowAIInput(false);
        setAiDirection("");
        toast({ title: "Conteúdo gerado com IA ✨" });
      }
    } catch (e) {
      console.error("AI error:", e);
      toast({ title: "Erro", description: "Falha ao conectar com a IA.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Adicionar conteúdo" : "Editar conteúdo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Formato</Label>
              <Select value={formatVal} onValueChange={setFormatVal}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Data de publicação</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !postDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {postDate ? format(postDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={postDate} onSelect={setPostDate} locale={ptBR} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de conteúdo</Label>
            <Input value={contentType} onChange={(e) => setContentType(e.target.value)} placeholder="Ex: educativo, promocional..." />
          </div>

          <div className="space-y-1.5">
            <Label>Instruções criativas</Label>
            <Textarea value={creativeInstructions} onChange={(e) => setCreativeInstructions(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Hashtags</Label>
            <Input value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#hashtag1, #hashtag2" />
          </div>
        </div>

        {/* AI direction input */}
        {showAIInput && (
          <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <Label className="text-xs flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Direcionamento (opcional)
            </Label>
            <Textarea
              value={aiDirection}
              onChange={(e) => setAiDirection(e.target.value)}
              placeholder="Descreva o tipo de conteúdo que deseja ou deixe em branco para a IA criar livremente..."
              rows={2}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAIGenerate} disabled={aiLoading} className="w-full">
              {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isNew ? "Criar com IA" : "Melhorar com IA"}
            </Button>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIInput(!showAIInput)}
            disabled={aiLoading}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            IA
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
