import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, Calendar, CheckCircle2, Copy, ExternalLink, ListChecks, Loader2, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { ContentPlan, ContentPlanItem } from "@/hooks/useContentPlanning";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { ContentPlanItemEditDialog } from "./ContentPlanItemEditDialog";
import { AIGenerateItemsDialog } from "./AIGenerateItemsDialog";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

interface ContentPlanDetailsSheetProps {
  plan: ContentPlan | null;
  open: boolean;
  onClose: () => void;
  onCreateTasks: (planId: string, itemIds: string[], assignedUserIds?: string[]) => Promise<boolean>;
  onUpdateItem?: (itemId: string, updates: Partial<ContentPlanItem>) => Promise<boolean>;
  onDeleteItem?: (itemId: string) => Promise<boolean>;
  onAddItem?: (planId: string, itemData: Partial<ContentPlanItem>) => Promise<boolean>;
  onDuplicateItem?: (item: ContentPlanItem) => Promise<boolean>;
}

const FORMAT_COLORS: Record<string, string> = {
  carrossel: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  feed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  reels: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  stories: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  video: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  planned: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  task_created: { label: "Tarefa criada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  in_progress: { label: "Em andamento", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  published: { label: "Publicado", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  discarded: { label: "Descartado", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

type ItemFilter = "all" | "planned" | "task_created" | "no_date" | "discarded";

type AgencyUserRow = {
  user_id: string;
  role: string | null;
  profiles?: { name?: string | null } | null;
};

function getStrategyText(plan: ContentPlan) {
  const aiResp = plan.ai_response as { strategy_summary?: string } | null;
  if (aiResp?.strategy_summary) return aiResp.strategy_summary;
  if (typeof plan.strategy_context === "string") return plan.strategy_context;
  const ctx = plan.strategy_context as { notes?: string; strategicFocus?: string } | null;
  return ctx?.notes || ctx?.strategicFocus || "";
}

function isTaskCreated(item: ContentPlanItem) {
  return !!item.task_id || ["task_created", "in_progress", "published"].includes(item.status);
}

export function ContentPlanDetailsSheet({
  plan,
  open,
  onClose,
  onCreateTasks,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onDuplicateItem,
}: ContentPlanDetailsSheetProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ContentPlanItem | null>(null);
  const [filter, setFilter] = useState<ItemFilter>("all");
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { currentAgency } = useAgency();
  const navigate = useNavigate();

  const { data: agencyUsers = [] } = useQuery({
    queryKey: ["agency-users-for-plan", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from("agency_users")
        .select("id, user_id, role, profiles:user_id(name)")
        .eq("agency_id", currentAgency.id);
      return ((data || []) as AgencyUserRow[]).map((agencyUser) => ({
        id: agencyUser.user_id,
        user_id: agencyUser.user_id,
        name: agencyUser.profiles?.name || "Sem nome",
        role: agencyUser.role,
      }));
    },
    enabled: !!currentAgency?.id && open,
  });

  useEffect(() => {
    setSelectedItems(new Set());
    setAssignedUserIds([]);
    setFilter("all");
  }, [plan?.id]);

  const items = useMemo(() => plan?.content_plan_items || [], [plan?.content_plan_items]);

  if (!plan) return null;

  const pendingItems = items.filter((item) => item.status === "planned" && !item.task_id);
  const createdItems = items.filter(isTaskCreated);
  const discardedItems = items.filter((item) => item.status === "discarded");
  const operationalItems = items.filter((item) => item.status !== "discarded");
  const progress = operationalItems.length > 0 ? Math.round((createdItems.length / operationalItems.length) * 100) : 0;
  const strategyText = getStrategyText(plan);

  const filteredItems = items.filter((item) => {
    if (filter === "planned") return item.status === "planned" && !item.task_id;
    if (filter === "task_created") return isTaskCreated(item);
    if (filter === "no_date") return !item.post_date && item.status !== "discarded";
    if (filter === "discarded") return item.status === "discarded";
    return true;
  });

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    if (selectedItems.size === pendingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(pendingItems.map((item) => item.id)));
    }
  };

  const handleCreateTasks = async () => {
    if (selectedItems.size === 0) return;
    setCreating(true);
    await onCreateTasks(plan.id, Array.from(selectedItems), assignedUserIds);
    setSelectedItems(new Set());
    setCreating(false);
  };

  const handleAddItem = () => {
    if (!onAddItem) return;
    setEditingItem({
      id: "__new__",
      plan_id: plan.id,
      day_number: null,
      order_position: items.length,
      post_date: null,
      due_date: null,
      title: "",
      description: null,
      caption: null,
      content_type: null,
      format: null,
      platform: null,
      creative_instructions: null,
      reference_notes: null,
      objective: null,
      hashtags: null,
      status: "planned",
      task_id: null,
      created_at: new Date().toISOString(),
    });
  };

  const handleSaveItem = async (itemId: string, updates: Partial<ContentPlanItem>) => {
    if (itemId === "__new__" && onAddItem) return onAddItem(plan.id, updates);
    if (onUpdateItem) return onUpdateItem(itemId, updates);
    return false;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col h-full">
          <SheetHeader className="shrink-0">
            <SheetTitle>{plan.clients?.name || "Cliente"} - {plan.title}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4 flex-1 flex flex-col min-h-0">
            <div className="grid gap-3 sm:grid-cols-4 shrink-0">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-semibold">{pendingItems.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-lg font-semibold">{createdItems.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Descartados</p>
                <p className="text-lg font-semibold">{discardedItems.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Origem</p>
                <p className="text-lg font-semibold">{plan.creation_mode === "manual" ? "Manual" : "IA"}</p>
              </div>
            </div>

            <div className="space-y-2 shrink-0">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso de tarefas</span>
                <span className="font-medium">{createdItems.length}/{operationalItems.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {strategyText && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20 shrink-0">
                <p className="text-xs font-medium text-primary mb-1">Contexto estrategico</p>
                <p className="text-xs text-muted-foreground">{strategyText}</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
              <Select value={filter} onValueChange={(value) => setFilter(value as ItemFilter)}>
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="planned">Pendentes</SelectItem>
                  <SelectItem value="task_created">Com tarefa</SelectItem>
                  <SelectItem value="no_date">Sem data</SelectItem>
                  <SelectItem value="discarded">Descartados</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setAiDialogOpen(true)} disabled={!plan}>
                  <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  IA
                </Button>
                {onAddItem && (
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar conteudo
                  </Button>
                )}
              </div>
            </div>

            {pendingItems.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <Checkbox checked={selectedItems.size === pendingItems.length && pendingItems.length > 0} onCheckedChange={selectAllPending} />
                <span className="text-xs text-muted-foreground">Selecionar todos pendentes ({pendingItems.length})</span>
              </div>
            )}

            {pendingItems.length > 0 && (
              <div className="space-y-2 shrink-0">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5" />
                  Responsaveis pelas tarefas
                </Label>
                <MultiUserSelector
                  users={agencyUsers}
                  selectedUserIds={assignedUserIds}
                  onSelectionChange={setAssignedUserIds}
                  placeholder="Selecionar responsaveis..."
                />
              </div>
            )}

            <ScrollArea className="flex-1 pr-2 min-w-0">
              <div className="space-y-2 min-w-0">

                {filteredItems.map((item) => {
                  const isPending = item.status === "planned" && !item.task_id;
                  const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.planned;
                  return (
                    <div key={item.id} className={`p-3 rounded-md border bg-card overflow-hidden w-full max-w-full ${isPending && selectedItems.has(item.id) ? "border-primary/40 bg-primary/5" : ""}`}>
                      <div className="flex items-start gap-2 w-full min-w-0">
                        {isPending ? (
                          <Checkbox checked={selectedItems.has(item.id)} onCheckedChange={() => toggleItem(item.id)} className="mt-0.5 shrink-0" />
                        ) : (
                          <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${item.status === "discarded" ? "text-muted-foreground" : "text-green-500"}`} />
                        )}

                        <div className="flex-1 min-w-0 space-y-1.5 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <p className="text-sm font-medium truncate max-w-full min-w-0 flex-1">{item.title}</p>
                            <Badge className={`text-[10px] shrink-0 ${statusInfo.className}`}>{statusInfo.label}</Badge>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {item.post_date && (
                              <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                                <Calendar className="h-2.5 w-2.5" />
                                {new Date(item.post_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                              </Badge>
                            )}
                            {item.format && <Badge className={`text-[10px] shrink-0 ${FORMAT_COLORS[item.format] || ""}`}>{item.format}</Badge>}
                            {item.platform && <Badge variant="outline" className="text-[10px] shrink-0">{item.platform}</Badge>}
                          </div>
                          {item.description && <p className="text-xs text-muted-foreground line-clamp-2 break-all">{item.description}</p>}
                          {item.caption && <p className="text-xs text-muted-foreground line-clamp-2 break-all">Legenda: {item.caption}</p>}
                        </div>

                        <div className="flex gap-1 shrink-0 ml-auto">
                          {!item.task_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDuplicateItem && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicateItem(item)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {item.task_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/dashboard/tasks")}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDeleteItem && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => onDeleteItem(item.id)}
                            >
                              {item.task_id ? <Archive className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="text-sm font-medium">Nenhum conteudo neste filtro</p>
                    <p className="text-xs text-muted-foreground mt-1">Adicione conteudos ou ajuste os filtros do planejamento.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {pendingItems.length > 0 && (
              <div className="shrink-0 pt-4 border-t">
                {assignedUserIds.length === 0 && selectedItems.size > 0 && (
                  <p className="text-xs text-destructive mb-2">Selecione ao menos um responsavel para criar as tarefas.</p>
                )}
                <Button className="w-full" onClick={handleCreateTasks} disabled={creating || selectedItems.size === 0 || assignedUserIds.length === 0}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
                  Criar {selectedItems.size} tarefas
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ContentPlanItemEditDialog
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
        planItems={items}
        planStrategy={strategyText}
      />

      <AIGenerateItemsDialog
        plan={plan}
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
      />
    </>
  );
}
