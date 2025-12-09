import { ChevronDown, FileText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TaskTemplate } from "@/hooks/useTaskTemplates";

interface QuickTemplatesDropdownProps {
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  onOpenFullSelector: () => void;
}

export function QuickTemplatesDropdown({
  templates,
  onSelectTemplate,
  onOpenFullSelector,
}: QuickTemplatesDropdownProps) {
  const topTemplates = templates.slice(0, 6);

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      high: { label: "Alta", variant: "destructive" },
      medium: { label: "Média", variant: "default" },
      low: { label: "Baixa", variant: "secondary" },
    };
    return config[priority] || config.medium;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Templates
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          Templates Rápidos
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {topTemplates.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Nenhum template disponível
          </div>
        ) : (
          topTemplates.map((template) => {
            const priorityConfig = getPriorityBadge(template.default_priority);
            return (
              <DropdownMenuItem
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="flex flex-col items-start gap-1 cursor-pointer py-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="text-lg">{template.icon}</span>
                  <span className="font-medium flex-1 truncate">{template.name}</span>
                  <Badge variant={priorityConfig.variant} className="text-xs">
                    {priorityConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground ml-7">
                  {template.category && (
                    <span>{template.category}</span>
                  )}
                  {template.subtasks.length > 0 && (
                    <span>{template.subtasks.length} subtarefas</span>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        
        {templates.length > 6 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onOpenFullSelector}
              className="text-center justify-center text-primary cursor-pointer"
            >
              Ver todos os templates ({templates.length})
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
