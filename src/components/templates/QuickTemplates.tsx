import { Clock, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskTemplate } from "@/hooks/useTaskTemplates";

interface QuickTemplatesProps {
  templates: TaskTemplate[];
  onSelectTemplate: (template: TaskTemplate) => void;
  maxVisible?: number;
}

export function QuickTemplates({
  templates,
  onSelectTemplate,
  maxVisible = 4,
}: QuickTemplatesProps) {
  // Mostrar os templates mais usados (ordenados por usage_count)
  const topTemplates = templates
    .slice(0, maxVisible);

  if (topTemplates.length === 0) return null;

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "border-l-red-500",
      medium: "border-l-yellow-500",
      low: "border-l-blue-500",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-yellow-500" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Templates Rápidos
        </h3>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {topTemplates.map((template) => (
          <Card
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className={`p-3 cursor-pointer border-l-4 ${getPriorityColor(template.default_priority)} hover:bg-accent/50 transition-colors`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{template.name}</h4>
                {template.category && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {template.category}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {template.estimated_duration_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {template.estimated_duration_hours}h
                </span>
              )}
              {template.subtasks.length > 0 && (
                <span>{template.subtasks.length} sub</span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
