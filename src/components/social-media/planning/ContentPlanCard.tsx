import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, MoreVertical, Trash2, Eye, ListChecks, MessageSquareText } from "lucide-react";
import { ContentPlan } from "@/hooks/useContentPlanning";

interface ContentPlanCardProps {
  plan: ContentPlan;
  onView: (plan: ContentPlan) => void;
  onCreateTasks: (plan: ContentPlan) => void;
  onDelete: (planId: string) => void;
  onCopyWeeklySummary?: (plan: ContentPlan) => void;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  active: { label: "Ativo", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  completed: { label: "Concluído", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  archived: { label: "Arquivado", className: "bg-muted text-muted-foreground" },
};

export function ContentPlanCard({ plan, onView, onCreateTasks, onDelete, onCopyWeeklySummary }: ContentPlanCardProps) {
  const items = plan.content_plan_items || [];
  const totalItems = items.length;
  const taskCreated = items.filter((i) => i.status === "task_created" || i.status === "in_progress" || i.status === "published").length;
  const progress = totalItems > 0 ? Math.round((taskCreated / totalItems) * 100) : 0;

  const statusInfo = STATUS_MAP[plan.status] || STATUS_MAP.draft;

  const monthLabel = (() => {
    const [year, month] = plan.month_year.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  })();

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(plan)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{plan.clients?.name || "Cliente"}</p>
            <p className="text-xs text-muted-foreground truncate">{plan.title}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(plan); }}>
                  <Eye className="h-4 w-4 mr-2" />Ver detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCreateTasks(plan); }}>
                  <ListChecks className="h-4 w-4 mr-2" />Criar tarefas
                </DropdownMenuItem>
                {onCopyWeeklySummary && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyWeeklySummary(plan); }}>
                    <MessageSquareText className="h-4 w-4 mr-2" />Resumo semanal
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(plan.id); }}>
                  <Trash2 className="h-4 w-4 mr-2" />Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="capitalize">{monthLabel}</span>
          <span>•</span>
          <span>{totalItems} conteúdos</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{taskCreated}/{totalItems} tarefas criadas</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {items.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {[...new Set(items.map((i) => i.format).filter(Boolean))].slice(0, 4).map((f) => (
              <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
            ))}
            {[...new Set(items.map((i) => i.platform).filter(Boolean))].slice(0, 3).map((p) => (
              <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
