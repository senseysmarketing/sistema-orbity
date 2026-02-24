import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Save, ListChecks, Loader2, Calendar, Sparkles, Users } from "lucide-react";
import { AIPlanResult, WizardData } from "@/hooks/useContentPlanning";

interface ContentPlanPreviewProps {
  open: boolean;
  onClose: () => void;
  planResult: AIPlanResult;
  wizardData: WizardData;
  onSave: () => Promise<void>;
  onSaveAndCreateTasks: (selectedIds: number[]) => Promise<void>;
  saving: boolean;
}

const FORMAT_COLORS: Record<string, string> = {
  carrossel: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  feed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  reels: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  stories: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const TYPE_LABELS: Record<string, string> = {
  educativo: "Educativo",
  informativo: "Informativo",
  autoridade: "Autoridade",
  prova_social: "Prova Social",
  bastidores: "Bastidores",
  conversao: "Conversão",
  trend: "Trend",
  objecoes: "Objeções",
  storytelling: "Storytelling",
  tutorial: "Tutorial",
};

export function ContentPlanPreview({
  open,
  onClose,
  planResult,
  wizardData,
  onSave,
  onSaveAndCreateTasks,
  saving,
}: ContentPlanPreviewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(planResult.items.map((_, i) => i))
  );

  const toggleItem = (index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedItems.size === planResult.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(planResult.items.map((_, i) => i)));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Planejamento Gerado — {wizardData.clientName}
          </DialogTitle>
        </DialogHeader>

        {/* Strategy summary */}
        {planResult.strategy_summary && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm font-medium text-primary mb-1">Estratégia do Período</p>
            <p className="text-sm text-muted-foreground">{planResult.strategy_summary}</p>
          </div>
        )}

        {/* Assigned users info */}
        {wizardData.assignedUserIds && wizardData.assignedUserIds.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Responsáveis:</span>
            <Badge variant="secondary">{wizardData.assignedUserIds.length} usuário(s) atribuído(s)</Badge>
          </div>
        )}

        {/* Selection bar */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedItems.size === planResult.items.length}
              onCheckedChange={toggleAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedItems.size}/{planResult.items.length} selecionados
            </span>
          </div>
          <Badge variant="secondary">{planResult.items.length} conteúdos</Badge>
        </div>

        {/* Items list */}
        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-3">
            {planResult.items.map((item, index) => (
              <Card
                key={index}
                className={`transition-colors ${selectedItems.has(index) ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedItems.has(index)}
                      onCheckedChange={() => toggleItem(index)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.post_date && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.post_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", weekday: "short" })}
                          </Badge>
                        )}
                        {item.format && (
                          <Badge className={`text-[10px] ${FORMAT_COLORS[item.format] || "bg-muted text-muted-foreground"}`}>
                            {item.format}
                          </Badge>
                        )}
                        {item.platform && <Badge variant="outline" className="text-[10px]">{item.platform}</Badge>}
                        {item.content_type && (
                          <Badge variant="secondary" className="text-[10px]">
                            {TYPE_LABELS[item.content_type] || item.content_type}
                          </Badge>
                        )}
                      </div>

                      <p className="font-medium text-sm">{item.title}</p>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      )}

                      {item.objective && (
                        <p className="text-xs text-primary/80">🎯 {item.objective}</p>
                      )}

                      {wizardData.depthLevel === "detailed" && item.creative_instructions && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
                          <span className="font-medium">Instruções criativas: </span>
                          {item.creative_instructions}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving} className="sm:flex-1">
            Voltar ao Wizard
          </Button>
          <Button variant="secondary" onClick={onSave} disabled={saving} className="sm:flex-1">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Planejamento
          </Button>
          <Button
            onClick={() => onSaveAndCreateTasks(Array.from(selectedItems))}
            disabled={saving || selectedItems.size === 0}
            className="sm:flex-1"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2" />}
            Salvar e Criar {selectedItems.size} Tarefas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
