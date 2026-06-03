import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const FORMATS = ["carrossel", "feed", "reels", "stories", "video", "artigo"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Twitter/X"];

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function normalizePlatform(value: string | null | undefined): string {
  if (!value) return "";
  const found = PLATFORMS.find((platform) => platform.toLowerCase() === value.toLowerCase());
  return found || "";
}

export function ContentPlanItemEditDialog({ item, open, onClose, onSave, planItems, planStrategy }: ContentPlanItemEditDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [caption, setCaption] = useState("");
  const [postDate, setPostDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [formatVal, setFormatVal] = useState("");
  const [platform, setPlatform] = useState("");
  const [contentType, setContentType] = useState("");
  const [creativeInstructions, setCreativeInstructions] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [objective, setObjective] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const { toast } = useToast();
  const { currentAgency } = useAgency();

  const isNew = item?.id === "__new__";
  const hasTask = !!item?.task_id;

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setCaption(item.caption || "");
      setPostDate(item.post_date ? new Date(item.post_date + "T12:00:00") : undefined);
      setDueDate(item.due_date ? new Date(item.due_date + "T12:00:00") : undefined);
      setFormatVal(item.format || "");
      setPlatform(normalizePlatform(item.platform));
      setContentType(item.content_type || "");
      setCreativeInstructions(item.creative_instructions || "");
      setReferenceNotes(item.reference_notes || "");
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
      caption: caption || null,
      post_date: postDate ? format(postDate, "yyyy-MM-dd") : null,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      format: formatVal || null,
      platform: platform || null,
      content_type: contentType || null,
      creative_instructions: creativeInstructions || null,
      reference_notes: referenceNotes || null,
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
        .filter((planItem) => planItem.id !== item?.id)
        .map((planItem) => `- ${planItem.title} (${planItem.format || "sem formato"}, ${planItem.platform || "sem plataforma"})`)
        .join("\n");

      const currentItemContext = !isNew && title
        ? `\n\nConteudo atual para melhorar:\nTitulo: ${title}\nDescricao: ${description}\nLegenda: ${caption}\nFormato: ${formatVal}\nPlataforma: ${platform}\nTipo: ${contentType}\nObjetivo: ${objective}\nInstrucoes criativas: ${creativeInstructions}\nReferencias: ${referenceNotes}\nHashtags: ${hashtags}`
        : "";

      const content = [
        planStrategy ? `Estrategia do plano: ${planStrategy}` : "",
        otherItems ? `Outros conteudos ja planejados:\n${otherItems}` : "",
        currentItemContext,
        aiDirection ? `\nDirecionamento do usuario: ${aiDirection}` : "",
        isNew ? "\nCrie um conteudo NOVO e original." : "\nMelhore o conteudo existente mantendo o proposito.",
      ].filter(Boolean).join("\n");

      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { type: "edit_plan_item", content, agency_id: currentAgency?.id },
      });

      if (error || data?.error) {
        toast({ title: "Erro na IA", description: data?.error || "Nao foi possivel gerar o conteudo.", variant: "destructive" });
        return;
      }

      const result = data?.result;
      if (result) {
        if (result.title) setTitle(result.title);
        if (result.description) setDescription(result.description);
        if (result.caption) setCaption(result.caption);
        if (result.format) setFormatVal(result.format);
        if (result.platform) setPlatform(normalizePlatform(result.platform));
        if (result.content_type) setContentType(result.content_type);
        if (result.creative_instructions) setCreativeInstructions(result.creative_instructions);
        if (result.reference_notes) setReferenceNotes(result.reference_notes);
        if (result.objective) setObjective(result.objective);
        if (result.hashtags) setHashtags(result.hashtags);
        setShowAIInput(false);
        setAiDirection("");
        toast({ title: "Conteudo gerado com IA" });
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Adicionar conteudo" : "Editar conteudo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasTask && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              Este conteudo ja gerou uma tarefa. Alteracoes aqui nao atualizam a tarefa automaticamente nesta versao.
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Titulo *</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Data de vencimento *</Label>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Formato *</Label>
              <Select value={formatVal} onValueChange={setFormatVal}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((formatItem) => <SelectItem key={formatItem} value={formatItem}>{capitalize(formatItem)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plataforma *</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((platformItem) => <SelectItem key={platformItem} value={platformItem}>{platformItem}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de conteudo</Label>
            <Input value={contentType} onChange={(event) => setContentType(event.target.value)} placeholder="Ex: educativo, promocional..." />
          </div>

          <div className="space-y-1.5">
            <Label>Objetivo</Label>
            <Input value={objective} onChange={(event) => setObjective(event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Ideia / descricao</Label>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Legenda sugerida</Label>
            <Textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label>Instrucoes criativas</Label>
            <Textarea value={creativeInstructions} onChange={(event) => setCreativeInstructions(event.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Referencias / observacoes</Label>
            <Textarea value={referenceNotes} onChange={(event) => setReferenceNotes(event.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Hashtags</Label>
            <Input value={hashtags} onChange={(event) => setHashtags(event.target.value)} placeholder="#hashtag1, #hashtag2" />
          </div>
        </div>

        {showAIInput && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Label className="text-xs flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Direcionamento opcional
            </Label>
            <Textarea
              value={aiDirection}
              onChange={(event) => setAiDirection(event.target.value)}
              placeholder="Descreva o tipo de conteudo que deseja ou deixe em branco para a IA criar livremente..."
              rows={2}
              className="text-sm"
            />
            <Button size="sm" onClick={handleAIGenerate} disabled={aiLoading} className="w-full">
              {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isNew ? "Criar com IA" : "Melhorar com IA"}
            </Button>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowAIInput(!showAIInput)} disabled={aiLoading} className="gap-1.5">
            <Sparkles className="h-4 w-4" />
            IA
          </Button>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !formatVal || !platform}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
