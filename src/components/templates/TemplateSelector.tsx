import { useState } from "react";
import { Search, FileText, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskTemplate } from "@/hooks/useTaskTemplates";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
}

export function TemplateSelector({
  open,
  onOpenChange,
  templates,
  onSelectTemplate,
}: TemplateSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      high: { label: "Alta", className: "bg-red-500/10 text-red-500 border-red-500/20" },
      medium: { label: "Média", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      low: { label: "Baixa", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    };
    const variant = variants[priority] || variants.medium;
    return <Badge variant="outline" className={variant.className}>{variant.label}</Badge>;
  };

  const handleSelect = (template: TaskTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Selecionar Template
          </DialogTitle>
          <DialogDescription>
            Escolha um template para preencher automaticamente os dados da tarefa.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[350px] pr-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhum template encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template)}
                  className="w-full text-left p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{template.icon}</span>
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        {template.category && (
                          <span className="text-xs text-muted-foreground">
                            {template.category}
                          </span>
                        )}
                      </div>
                    </div>
                    {getPriorityBadge(template.default_priority)}
                  </div>

                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {template.subtasks.length > 0 && (
                      <span>{template.subtasks.length} subtarefas</span>
                    )}
                    {template.usage_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {template.usage_count} usos
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
