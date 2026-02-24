import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { ListChecks, Loader2, Calendar, CheckCircle2, Users } from "lucide-react";
import { ContentPlan } from "@/hooks/useContentPlanning";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

interface ContentPlanDetailsSheetProps {
  plan: ContentPlan | null;
  open: boolean;
  onClose: () => void;
  onCreateTasks: (planId: string, itemIds: string[], assignedUserIds?: string[]) => Promise<boolean>;
}

const FORMAT_COLORS: Record<string, string> = {
  carrossel: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  feed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  reels: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  stories: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  planned: { label: "Planejado", className: "bg-muted text-muted-foreground" },
  task_created: { label: "Tarefa Criada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  in_progress: { label: "Em Andamento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  published: { label: "Publicado", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
};

export function ContentPlanDetailsSheet({ plan, open, onClose, onCreateTasks }: ContentPlanDetailsSheetProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const { currentAgency } = useAgency();

  const { data: agencyUsers = [] } = useQuery({
    queryKey: ["agency-users-for-plan", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select("user_id, role, profiles(full_name)")
        .eq("agency_id", currentAgency.id);
      return (data || []).map((u: any) => ({
        id: u.user_id,
        user_id: u.user_id,
        name: u.profiles?.full_name || "Sem nome",
        role: u.role,
      }));
    },
    enabled: !!currentAgency?.id && open,
  });

  // Reset selections when plan changes
  useEffect(() => {
    setSelectedItems(new Set());
    setAssignedUserIds([]);
  }, [plan?.id]);

  if (!plan) return null;

  const items = plan.content_plan_items || [];
  const plannedItems = items.filter((i) => i.status === "planned");
  const taskCreated = items.filter((i) => i.status !== "planned").length;
  const progress = items.length > 0 ? Math.round((taskCreated / items.length) * 100) : 0;

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPlanned = () => {
    if (selectedItems.size === plannedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(plannedItems.map((i) => i.id)));
    }
  };

  const handleCreateTasks = async () => {
    if (selectedItems.size === 0) return;
    setCreating(true);
    await onCreateTasks(plan.id, Array.from(selectedItems), assignedUserIds);
    setSelectedItems(new Set());
    setCreating(false);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
        <SheetHeader className="shrink-0">
          <SheetTitle>{plan.clients?.name} — {plan.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4 flex-1 flex flex-col min-h-0">
          {/* Progress */}
          <div className="space-y-2 shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{taskCreated}/{items.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Strategy */}
          {plan.ai_response?.strategy_summary && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 shrink-0">
              <p className="text-xs font-medium text-primary mb-1">Estratégia</p>
              <p className="text-xs text-muted-foreground">{plan.ai_response.strategy_summary}</p>
            </div>
          )}

          {/* Select all */}
          {plannedItems.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <Checkbox checked={selectedItems.size === plannedItems.length && plannedItems.length > 0} onCheckedChange={selectAllPlanned} />
              <span className="text-xs text-muted-foreground">
                Selecionar todos pendentes ({plannedItems.length})
              </span>
            </div>
          )}

          {/* User selector */}
          {plannedItems.length > 0 && (
            <div className="space-y-2 shrink-0">
              <Label className="flex items-center gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                Responsáveis pelas tarefas
              </Label>
              <MultiUserSelector
                users={agencyUsers}
                selectedUserIds={assignedUserIds}
                onSelectionChange={setAssignedUserIds}
                placeholder="Selecionar responsáveis..."
              />
            </div>
          )}

          {/* Items */}
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-2">
              {items.map((item) => {
                const isPlanned = item.status === "planned";
                const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.planned;
                return (
                  <div key={item.id} className={`p-3 rounded-lg border bg-card ${isPlanned && selectedItems.has(item.id) ? "border-primary/40 bg-primary/5" : ""}`}>
                    <div className="flex items-start gap-2">
                      {isPlanned ? (
                        <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItem(item.id)} className="mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.post_date && (
                            <Badge variant="outline" className="text-[10px] gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(item.post_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                            </Badge>
                          )}
                          {item.format && <Badge className={`text-[10px] ${FORMAT_COLORS[item.format] || ""}`}>{item.format}</Badge>}
                          <Badge className={`text-[10px] ${statusInfo.className}`}>{statusInfo.label}</Badge>
                        </div>
                        {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Footer action */}
          {plannedItems.length > 0 && (
            <div className="shrink-0 pt-4 border-t">
              <Button className="w-full" onClick={handleCreateTasks} disabled={creating || selectedItems.size === 0}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2" />}
                Criar {selectedItems.size} Tarefas
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
