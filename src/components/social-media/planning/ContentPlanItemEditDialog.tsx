import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentPlanItem } from "@/hooks/useContentPlanning";

interface ContentPlanItemEditDialogProps {
  item: ContentPlanItem | null;
  open: boolean;
  onClose: () => void;
  onSave: (itemId: string, updates: Partial<ContentPlanItem>) => Promise<boolean>;
}

const FORMATS = ["carrossel", "feed", "reels", "stories", "vídeo", "artigo"];
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn", "YouTube", "Twitter/X"];

export function ContentPlanItemEditDialog({ item, open, onClose, onSave }: ContentPlanItemEditDialogProps) {
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

  useEffect(() => {
    if (item) {
      setTitle(item.title || "");
      setDescription(item.description || "");
      setPostDate(item.post_date ? new Date(item.post_date + "T12:00:00") : undefined);
      setFormatVal(item.format || "");
      setPlatform(item.platform || "");
      setContentType(item.content_type || "");
      setCreativeInstructions(item.creative_instructions || "");
      setObjective(item.objective || "");
      setHashtags(item.hashtags || "");
    }
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar conteúdo</DialogTitle>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
