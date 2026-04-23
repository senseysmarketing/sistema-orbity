import { useState, useEffect, useMemo } from "react";
import { Plus, Search, LayoutGrid, TrendingUp, Settings, FileText, Tag, Filter, X, Check, ChevronsUpDown, RotateCw, List, LayoutDashboard } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TaskListView } from "@/components/tasks/TaskListView";
import { getVirtualAgencyClient, separateVirtualClients, isVirtualAgencyClient } from "@/lib/virtualAgencyClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { AIPreFillStep } from "@/components/ui/ai-prefill-step";
import { useAIAssist, TaskPrefillResult } from "@/hooks/useAIAssist";
import { SubtaskManager, Subtask } from "@/components/ui/subtask-manager";
import { FileAttachments, Attachment } from "@/components/ui/file-attachments";
import { WizardStepIndicator } from "@/components/ui/wizard-step-indicator";
import { WizardReviewStep } from "@/components/ui/wizard-review-step";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/ui/kanban-column";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRange } from "react-day-picker";
import { DateRangeFilterDialog } from "@/components/filters/DateRangeFilterDialog";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { MultiClientSelector } from "@/components/clients/MultiClientSelector";
import { TaskAnalytics } from "@/components/tasks/TaskAnalytics";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { TaskStatusManager } from "@/components/tasks/TaskStatusManager";
import { TaskTypeManager } from "@/components/tasks/TaskTypeManager";
import { TaskTemplateManager } from "@/components/templates/TaskTemplateManager";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { QuickTemplatesDropdown } from "@/components/templates/QuickTemplatesDropdown";
import { SortableTaskCard } from "@/components/ui/sortable-task-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useTaskAssignments } from "@/hooks/useTaskAssignments";
import { useTaskTemplates, TaskTemplate } from "@/hooks/useTaskTemplates";
import { useTaskStatuses } from "@/hooks/useTaskStatuses";
import { useTaskTypes } from "@/hooks/useTaskTypes";
import { useClientRelations } from "@/hooks/useClientRelations";
import { replaceTemplateVariables, calculateDueDate } from "@/lib/templateVariables";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { computeNextDueDate, type RecurrenceRule, type RecurrenceFrequency } from "@/lib/recurrence";

// Campos de select consistentes para fetchTasks e refetch individual via Realtime.
// Manter esta string sincronizada garante que joins (clients/assignments) não se percam em updates ao vivo.
const TASK_QUERY_FIELDS = "*, task_clients(client_id), task_assignments(user_id)";

interface AssignedUser {
  user_id: string;
  name: string;
  role: string;
  id: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: "low" | "medium" | "high";
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at?: string;
  created_by: string;
  archived?: boolean;
  history?: any[];
  subtasks?: Subtask[];
  attachments?: Attachment[];
  task_type?: string | null;
  platform?: string | null;
  post_type?: string | null;
  post_date?: string | null;
  hashtags?: string[] | null;
  creative_instructions?: string | null;
  is_internal?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule | null;
  recurrence_parent_id?: string | null;
  next_occurrence_generated?: boolean;
  _assignedUsers?: AssignedUser[];
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
}


const taskFormSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().nullable().optional().default(""),
  status: z.string().default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.string().default("unassigned"),
  assigned_users: z.array(z.string()).default([]),
  client_ids: z.array(z.string()).default([]),
  due_date: z.string().nullable().optional().default(""),
  subtasks: z.array(z.any()).default([]),
  attachments: z.array(z.any()).default([]),
  task_type: z.string().min(1, "Tipo obrigatório"),
  platform: z.string().nullable().optional().default(""),
  post_type: z.string().nullable().optional().default(""),
  post_date: z.string().nullable().optional().default(""),
  hashtags: z.string().nullable().optional().default(""),
  creative_instructions: z.string().nullable().optional().default(""),
  is_recurring: z.boolean().default(false),
  recurrence_frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  recurrence_interval: z.number().int().min(1).default(1),
  recurrence_days_of_week: z.array(z.number()).default([]),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const taskFormDefaults: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigned_to: "unassigned",
  assigned_users: [],
  client_ids: [],
  due_date: "",
  subtasks: [],
  attachments: [],
  task_type: "",
  platform: "",
  post_type: "",
  post_date: "",
  hashtags: "",
  creative_instructions: "",
  is_recurring: false,
  recurrence_frequency: "weekly",
  recurrence_interval: 1,
  recurrence_days_of_week: [],
};

// Reusable Recurrence config block
function RecurrenceFields({
  values,
  onChange,
}: {
  values: {
    is_recurring: boolean;
    recurrence_frequency: RecurrenceFrequency;
    recurrence_interval: number;
    recurrence_days_of_week: number[];
  };
  onChange: (patch: Partial<{
    is_recurring: boolean;
    recurrence_frequency: RecurrenceFrequency;
    recurrence_interval: number;
    recurrence_days_of_week: number[];
  }>) => void;
}) {
  const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
  const toggleDay = (idx: number) => {
    const next = values.recurrence_days_of_week.includes(idx)
      ? values.recurrence_days_of_week.filter((d) => d !== idx)
      : [...values.recurrence_days_of_week, idx].sort();
    onChange({ recurrence_days_of_week: next });
  };
  const unitLabel =
    values.recurrence_frequency === "daily"
      ? "dia(s)"
      : values.recurrence_frequency === "weekly"
      ? "semana(s)"
      : "mês(es)";

  return (
    <div className="grid gap-3 rounded-md border bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RotateCw className="h-4 w-4 text-primary" />
          <Label htmlFor="is-recurring" className="cursor-pointer">Tarefa recorrente</Label>
        </div>
        <Switch
          id="is-recurring"
          checked={values.is_recurring}
          onCheckedChange={(checked) => onChange({ is_recurring: checked })}
        />
      </div>

      {values.is_recurring && (
        <div className="grid gap-3 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Frequência</Label>
              <Select
                value={values.recurrence_frequency}
                onValueChange={(v) => onChange({ recurrence_frequency: v as RecurrenceFrequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Repetir a cada</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={values.recurrence_interval}
                  onChange={(e) =>
                    onChange({ recurrence_interval: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">{unitLabel}</span>
              </div>
            </div>
          </div>

          {values.recurrence_frequency === "weekly" && (
            <div className="grid gap-1.5">
              <Label className="text-xs">Dias da semana</Label>
              <div className="flex gap-1.5">
                {dayLabels.map((label, idx) => {
                  const active = values.recurrence_days_of_week.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={cn(
                        "h-8 w-8 rounded-md border text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-input"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [createStep, setCreateStep] = useState<number>(1);
  const { preFillTask, loading: aiLoading } = useAIAssist();

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [assignedFilter, setAssignedFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [dueDateRange, setDueDateRange] = useState<DateRange | undefined>(undefined);
  const [includeNoDueDate, setIncludeNoDueDate] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [sortBy, setSortBy] = useState<'due_date' | 'recent'>('due_date');

  const toStartOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const toEndOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskFormDefaults,
  });
  const newTask = form.watch();

  const { updateClientRelations } = useClientRelations();

  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const { assignUsersToTask } = useTaskAssignments();

  const { templates, incrementUsageCount } = useTaskTemplates();
  const { statuses, getStatusName, isValidStatus } = useTaskStatuses();
  const { types, getTypeName, getTypeShortName, getTypeIcon, isValidType } = useTaskTypes();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();

    // Arquivar tarefas concluídas há mais de 7 dias
    archiveOldCompletedTasks();
  }, [currentAgency?.id]);

  // Persistência da visão (Kanban/Lista) por agência
  useEffect(() => {
    if (!currentAgency?.id) return;
    const stored = localStorage.getItem(`tasks:view:${currentAgency.id}`);
    if (stored === 'kanban' || stored === 'list') {
      setView(stored);
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    if (!currentAgency?.id) return;
    localStorage.setItem(`tasks:view:${currentAgency.id}`, view);
  }, [view, currentAgency?.id]);

  // Toggle rápido de conclusão a partir da Vista em Lista
  const handleToggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const previousStatus = task.status;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as any, updated_by: profile?.user_id })
        .eq('id', task.id);
      if (error) throw error;

      await addHistoryEntry(task.id, `Status alterado para ${getStatusName(newStatus)}`);

      if (
        newStatus === 'done' &&
        task.is_recurring &&
        !task.next_occurrence_generated &&
        task.due_date &&
        task.recurrence_rule
      ) {
        const nextDue = computeNextDueDate(task.due_date, task.recurrence_rule);
        if (nextDue) {
          const { error: rpcError } = await supabase.rpc(
            'generate_next_recurring_task' as any,
            { p_task_id: task.id, p_next_due_date: nextDue }
          );
          if (rpcError) {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)));
            await supabase.from('tasks').update({ status: previousStatus as any }).eq('id', task.id);
            toast({ title: 'Falha ao gerar próxima ocorrência', description: rpcError.message, variant: 'destructive' });
            return;
          }
          toast({ title: '🔁 Próxima ocorrência criada', description: formatDateBR(nextDue.split('T')[0]) });
          fetchTasks();
          return;
        }
      }

      toast({ title: 'Sucesso', description: `Tarefa movida para ${getStatusName(newStatus)}!` });
    } catch (error: any) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previousStatus } : t)));
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
    }
  };


  const archiveOldCompletedTasks = async () => {
    if (!currentAgency) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { error } = await supabase
        .from("tasks")
        .update({ archived: true })
        .eq("agency_id", currentAgency.id)
        .eq("status", "done")
        .eq("archived", false)
        .lt("updated_at", sevenDaysAgo.toISOString());

      if (error) console.error("Error archiving old tasks:", error);
    } catch (error) {
      console.error("Error archiving old tasks:", error);
    }
  };

  const fetchTasks = async () => {
    if (!currentAgency) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [openResult, doneResult] = await Promise.all([
        supabase
          .from("tasks")
          .select(TASK_QUERY_FIELDS)
          .eq("agency_id", currentAgency.id)
          .eq("archived", false)
          .neq("status", "done")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("tasks")
          .select(TASK_QUERY_FIELDS)
          .eq("agency_id", currentAgency.id)
          .eq("archived", false)
          .eq("status", "done")
          .gte("updated_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (openResult.error) throw openResult.error;
      if (doneResult.error) throw doneResult.error;

      const rawTasks = [...(openResult.data || []), ...(doneResult.data || [])];

      // Extract unique user_ids from assignments
      const allUserIds = new Set<string>();
      rawTasks.forEach((task: any) => {
        (task.task_assignments || []).forEach((a: any) => allUserIds.add(a.user_id));
      });

      // Batch fetch profiles for assigned users
      let profilesMap: Record<string, { user_id: string; name: string; role: string; id: string }> = {};
      if (allUserIds.size > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, user_id, name, role')
          .in('user_id', Array.from(allUserIds));

        (profileData || []).forEach(p => {
          profilesMap[p.user_id] = p;
        });
      }

      // Enrich tasks with _assignedUsers
      const enrichedTasks = rawTasks.map((task: any) => {
        const assignedUsers = (task.task_assignments || []).map((a: any) => {
          const prof = profilesMap[a.user_id];
          return prof || { id: '', user_id: a.user_id, name: 'Usuário desconhecido', role: 'unknown' };
        });

        return {
          ...task,
          client_id: task.client_id || task.task_clients?.[0]?.client_id || null,
          _assignedUsers: assignedUsers,
        };
      });

      setTasks(enrichedTasks);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAssignedUsers = (taskId: string): AssignedUser[] => {
    const task = tasks.find(t => t.id === taskId);
    return task?._assignedUsers || [];
  };

  const fetchProfiles = async () => {
    if (!currentAgency) return;

    try {
      const { data: agencyUsers, error: agencyUsersError } = await supabase
        .from("agency_users")
        .select("user_id")
        .eq("agency_id", currentAgency.id);

      if (agencyUsersError) throw agencyUsersError;

      const userIds = agencyUsers?.map((au) => au.user_id) || [];

      if (userIds.length === 0) {
        setProfiles([]);
        return;
      }

      const { data, error } = await supabase.from("profiles").select("id, user_id, name, role").in("user_id", userIds);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar perfis:", error);
    }
  };

  const fetchClients = async () => {
    if (!currentAgency) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency.id)
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      const realClients = data || [];
      // Prepend virtual agency client
      if (currentAgency) {
        const virtualAgency = getVirtualAgencyClient(currentAgency);
        setClients([virtualAgency, ...realClients]);
      } else {
        setClients(realClients);
      }
    } catch (error: any) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Dados filtrados
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(task.priority);
      const matchesType = typeFilter.length === 0 || (task.task_type ? typeFilter.includes(task.task_type) : false);

      let matchesAssigned = true;
      if (assignedFilter.length > 0) {
        const taskAssignedUsers = getAssignedUsers(task.id);
        const matchesUnassigned = assignedFilter.includes("unassigned") && taskAssignedUsers.length === 0;
        const matchesSpecificUser = taskAssignedUsers.some((u) => assignedFilter.includes(u.user_id));
        matchesAssigned = matchesUnassigned || matchesSpecificUser;
      }

      let matchesClient = true;
      if (clientFilter.length > 0) {
        const matchesInternalAgency = clientFilter.some(id => isVirtualAgencyClient(id)) && task.is_internal;
        const matchesNoClient = clientFilter.includes("no-client") && !task.client_id && !task.is_internal;
        const matchesSpecificClient = task.client_id ? clientFilter.includes(task.client_id) : false;
        matchesClient = matchesInternalAgency || matchesNoClient || matchesSpecificClient;
      }

      const from = dueDateRange?.from ? toStartOfDay(dueDateRange.from) : undefined;
      const to = dueDateRange?.to ? toEndOfDay(dueDateRange.to) : undefined;
      const matchesDueDateRange = (() => {
        if (!from) return true;
        if (!task.due_date) return includeNoDueDate;
        const d = new Date(task.due_date);
        if (isNaN(d.getTime())) return includeNoDueDate;
        if (to) return d >= from && d <= to;
        return d >= from;
      })();

      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesClient && matchesDueDateRange && matchesType;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, assignedFilter, clientFilter, getAssignedUsers, dueDateRange, includeNoDueDate]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      todo: "A Fazer",
      in_progress: "Em Andamento",
      em_revisao: "Em Revisão",
      done: "Concluída",
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-500",
      medium: "bg-yellow-500",
      high: "bg-red-500",
    };
    return colors[priority] || "bg-gray-500";
  };

  const getClientName = (clientId: string | null, task?: Task) => {
    if (task?.is_internal && currentAgency) {
      const clientName = clientId ? clients.find((c) => c.id === clientId)?.name : null;
      if (clientName) return `${currentAgency.name} (Interno) / ${clientName}`;
      return `${currentAgency.name} (Interno)`;
    }
    if (!clientId) return "Sem cliente";
    const client = clients.find((c) => c.id === clientId);
    return client?.name || "Cliente desconhecido";
  };

  const formatDateBR = (value: string | null) => {
    if (!value) return "";
    const s = String(value);
    const date = s.includes("T") ? new Date(s) : new Date(`${s}T00:00:00`);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR");
  };

  const getUrgencyLevel = (task: Task) => {
    if (task.status === "done") {
      return { level: "completed", label: "Concluída", color: "bg-green-500 text-white" };
    }

    if (!task.due_date) {
      return { level: "normal", label: "", color: "" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    // Verifica se está atrasada (passou da data de vencimento)
    if (dueDate < today) {
      return { level: "overdue", label: "Atrasada", color: "bg-red-500 text-white" };
    }

    // Verifica se vence hoje
    if (dueDate.getTime() === today.getTime()) {
      return { level: "today", label: "Hoje", color: "bg-orange-500 text-white" };
    }

    // Verifica se vence esta semana (próximos 7 dias)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    if (dueDate > today && dueDate <= nextWeek) {
      return { level: "this-week", label: "Esta Semana", color: "bg-blue-500 text-white" };
    }

    return { level: "normal", label: "", color: "" };
  };

  const dateOnlyToISO = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const ts = Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0);
    return new Date(ts).toISOString();
  };

  const addHistoryEntry = async (taskId: string, action: string) => {
    try {
      // Get current task history and created_by
      const { data: currentTask } = await supabase
        .from("tasks")
        .select("history, created_by")
        .eq("id", taskId)
        .single();

      const currentHistory = Array.isArray(currentTask?.history) ? currentTask.history : [];
      
      // Se for o primeiro histórico, adicionar informação de criação
      if (currentHistory.length === 0 && currentTask?.created_by) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", currentTask.created_by)
          .single();

        if (creatorProfile) {
          currentHistory.push({
            action: "Tarefa criada",
            timestamp: new Date().toISOString(),
            user_name: creatorProfile.name,
          });
        }
      }

      const newEntry = {
        action,
        timestamp: new Date().toISOString(),
        user_name: profile?.name || "Usuário",
      };

      // Update task with new history entry
      await supabase
        .from("tasks")
        .update({
          history: [...currentHistory, newEntry] as any,
        })
        .eq("id", taskId);
    } catch (error) {
      console.error("Error adding history entry:", error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!newTask.task_type) {
      toast({
        title: "Erro",
        description: "O tipo da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const isSocial = newTask.task_type === "redes_sociais";
      const hasCreative = ["redes_sociais", "criativos"].includes(newTask.task_type);
      const hashtagsArray = isSocial && newTask.hashtags.trim()
        ? newTask.hashtags.split(",").map(h => h.trim()).filter(Boolean)
        : null;

      const recurrenceRulePayload: RecurrenceRule | null = newTask.is_recurring
        ? {
            frequency: newTask.recurrence_frequency,
            interval: Math.max(1, newTask.recurrence_interval || 1),
            ...(newTask.recurrence_frequency === "weekly" &&
            newTask.recurrence_days_of_week.length > 0
              ? { daysOfWeek: newTask.recurrence_days_of_week }
              : {}),
          }
        : null;

      const { data: taskData, error } = await supabase
        .from("tasks")
        .insert([{
          title: newTask.title,
          description: newTask.description,
          status: newTask.status as any,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
          client_id: separateVirtualClients(newTask.client_ids).realClientIds[0] || null,
          is_internal: separateVirtualClients(newTask.client_ids).isInternal,
          due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
          created_by: profile?.user_id,
          agency_id: currentAgency?.id,
          subtasks: newTask.subtasks as any,
          attachments: newTask.attachments as any,
          task_type: newTask.task_type || null,
          platform: isSocial ? (newTask.platform || null) : null,
          post_type: isSocial ? (newTask.post_type || null) : null,
          post_date: isSocial && newTask.post_date ? dateOnlyToISO(newTask.post_date) : null,
          hashtags: hashtagsArray,
          creative_instructions: hasCreative ? (newTask.creative_instructions || null) : null,
          is_recurring: !!newTask.is_recurring,
          recurrence_rule: recurrenceRulePayload as any,
        }])
        .select()
        .single();

      if (error) throw error;

      if (newTask.assigned_users.length > 0 && taskData) {
        await assignUsersToTask(taskData.id, newTask.assigned_users);
      }

      // Create client relations (only real clients)
      const { realClientIds: createRealIds } = separateVirtualClients(newTask.client_ids);
      if (taskData && createRealIds.length > 0) {
        await updateClientRelations("task", taskData.id, createRealIds);
      }

      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });

      form.reset(taskFormDefaults);
      setIsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const applyTemplate = (template: TaskTemplate) => {
    const clientName = template.default_client_id 
      ? clients.find((c) => c.id === template.default_client_id)?.name 
      : undefined;

    const context = {
      clientName,
      userName: profile?.name,
    };

    // Validate status - fallback to "todo" if template status is invalid/deleted
    const status = isValidStatus(template.default_status) ? template.default_status : "todo";

    // Guardrail 3: Use setValue to preserve user-filled fields
    form.setValue("title", replaceTemplateVariables(template.default_title, context), { shouldValidate: true });
    form.setValue("description", replaceTemplateVariables(template.default_description, context), { shouldValidate: true });
    form.setValue("status", status, { shouldValidate: true });
    form.setValue("priority", template.default_priority as "low" | "medium" | "high", { shouldValidate: true });
    form.setValue("assigned_to", "unassigned");
    form.setValue("assigned_users", template.auto_assign_creator && profile?.user_id ? [profile.user_id] : []);
    form.setValue("client_ids", template.default_client_id ? [template.default_client_id] : []);
    form.setValue("due_date", calculateDueDate(template.due_date_offset_days));
    form.setValue("subtasks", template.subtasks.map((st) => ({
      ...st,
      id: crypto.randomUUID(),
      completed: false,
    })));
    if ((template as any).default_task_type) {
      form.setValue("task_type", (template as any).default_task_type, { shouldValidate: true });
    }

    incrementUsageCount(template.id);
    setIsTemplateSelectorOpen(false);
    setCreateStep(2);
    setIsDialogOpen(true);

    toast({
      title: "Template aplicado",
      description: `Template "${template.name}" aplicado com sucesso!`,
    });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status as any,
      priority: task.priority as any,
      assigned_to: task.assigned_to || "unassigned",
      assigned_users: getAssignedUsers(task.id).map((u) => u.user_id),
      client_ids: [
        ...(task.is_internal && currentAgency ? [getVirtualAgencyClient(currentAgency).id] : []),
        ...(task.client_id ? [task.client_id] : []),
      ],
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      subtasks: task.subtasks || [],
      attachments: task.attachments || [],
      task_type: task.task_type || "",
      platform: task.platform || "",
      post_type: task.post_type || "",
      post_date: task.post_date ? task.post_date.split("T")[0] : "",
      hashtags: task.hashtags?.join(", ") || "",
      creative_instructions: task.creative_instructions || "",
      is_recurring: !!task.is_recurring,
      recurrence_frequency: (task.recurrence_rule?.frequency as RecurrenceFrequency) || "weekly",
      recurrence_interval: task.recurrence_rule?.interval || 1,
      recurrence_days_of_week: task.recurrence_rule?.daysOfWeek || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !newTask.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!newTask.task_type) {
      toast({
        title: "Erro",
        description: "O tipo da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Detectar mudanças
      const changes: string[] = [];
      
      if (selectedTask.title !== newTask.title) {
        changes.push(`Título: "${selectedTask.title}" → "${newTask.title}"`);
      }
      
      if (selectedTask.description !== newTask.description) {
        changes.push(`Descrição alterada`);
      }
      
      if (selectedTask.status !== newTask.status) {
        changes.push(`Status: ${getStatusLabel(selectedTask.status)} → ${getStatusLabel(newTask.status)}`);
      }
      
      if (selectedTask.priority !== newTask.priority) {
        changes.push(`Prioridade: ${getPriorityLabel(selectedTask.priority)} → ${getPriorityLabel(newTask.priority)}`);
      }
      
      const originalDueDate = selectedTask.due_date ? selectedTask.due_date.split('T')[0] : null;
      if (newTask.due_date !== originalDueDate) {
        const oldDate = originalDueDate ? formatDateBR(originalDueDate) : "Sem data";
        const newDate = newTask.due_date ? formatDateBR(newTask.due_date) : "Sem data";
        changes.push(`Data de vencimento: ${oldDate} → ${newDate}`);
      }

      const isSocialEdit = newTask.task_type === "redes_sociais";
      const hasCreativeEdit = ["redes_sociais", "criativos"].includes(newTask.task_type);
      const hashtagsArrayEdit = isSocialEdit && newTask.hashtags.trim()
        ? newTask.hashtags.split(",").map(h => h.trim()).filter(Boolean)
        : null;

      const recurrenceRulePayload: RecurrenceRule | null = newTask.is_recurring
        ? {
            frequency: newTask.recurrence_frequency,
            interval: Math.max(1, newTask.recurrence_interval || 1),
            ...(newTask.recurrence_frequency === "weekly" &&
            newTask.recurrence_days_of_week.length > 0
              ? { daysOfWeek: newTask.recurrence_days_of_week }
              : {}),
          }
        : null;

      const updates: any = {
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
        client_id: separateVirtualClients(newTask.client_ids).realClientIds[0] || null,
        is_internal: separateVirtualClients(newTask.client_ids).isInternal,
        due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
        subtasks: newTask.subtasks as any,
        attachments: newTask.attachments as any,
        task_type: newTask.task_type || null,
        platform: isSocialEdit ? (newTask.platform || null) : null,
        post_type: isSocialEdit ? (newTask.post_type || null) : null,
        post_date: isSocialEdit && newTask.post_date ? dateOnlyToISO(newTask.post_date) : null,
        hashtags: hashtagsArrayEdit,
        creative_instructions: hasCreativeEdit ? (newTask.creative_instructions || null) : null,
        updated_by: profile?.user_id,
        is_recurring: !!newTask.is_recurring,
        recurrence_rule: recurrenceRulePayload as any,
      };

      // Reset notification_sent_at if due_date changed
      if (newTask.due_date !== originalDueDate) {
        updates.notification_sent_at = null;
      }

      const becameDone =
        selectedTask.status !== "done" && newTask.status === "done";

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", selectedTask.id);

      if (error) throw error;

      // Recurring → spawn next occurrence atomically (after status update succeeds)
      if (
        becameDone &&
        selectedTask.is_recurring &&
        !selectedTask.next_occurrence_generated &&
        selectedTask.due_date &&
        (selectedTask.recurrence_rule || recurrenceRulePayload)
      ) {
        const ruleForNext = (recurrenceRulePayload || selectedTask.recurrence_rule) as RecurrenceRule;
        const nextDue = computeNextDueDate(selectedTask.due_date, ruleForNext);
        if (nextDue) {
          const { error: rpcError } = await supabase.rpc(
            "generate_next_recurring_task" as any,
            { p_task_id: selectedTask.id, p_next_due_date: nextDue }
          );
          if (rpcError) {
            // Rollback status change
            await supabase
              .from("tasks")
              .update({ status: selectedTask.status })
              .eq("id", selectedTask.id);
            toast({
              title: "Falha ao gerar próxima ocorrência",
              description: rpcError.message,
              variant: "destructive",
            });
            return;
          }
          toast({
            title: "🔁 Próxima ocorrência criada",
            description: formatDateBR(nextDue.split("T")[0]),
          });
        }
      }

      if (selectedTask) {
        await assignUsersToTask(selectedTask.id, newTask.assigned_users);
        
        // Adicionar histórico com mudanças detalhadas
        if (changes.length > 0) {
          await addHistoryEntry(selectedTask.id, `Tarefa editada: ${changes.join("; ")}`);
        }
      }

      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });

      setIsEditDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };

  const handleDuplicateTask = (task: Task) => {
    const taskAssignedUsers = getAssignedUsers(task.id);
    
    form.reset({
      title: `${task.title} (Cópia)`,
      description: task.description || '',
      status: 'todo',
      priority: task.priority || 'medium',
      assigned_to: 'unassigned',
      assigned_users: taskAssignedUsers.map((u: any) => u.user_id),
      client_ids: task.client_id ? [task.client_id] : [],
      due_date: '',
      subtasks: task.subtasks?.map(s => ({ 
        ...s, 
        id: crypto.randomUUID(), 
        completed: false 
      })) || [],
      attachments: [],
      task_type: task.task_type || "",
      platform: task.platform || "",
      post_type: task.post_type || "",
      post_date: "",
      hashtags: task.hashtags?.join(", ") || "",
      creative_instructions: task.creative_instructions || "",
      is_recurring: !!task.is_recurring,
      recurrence_frequency: (task.recurrence_rule?.frequency as RecurrenceFrequency) || "weekly",
      recurrence_interval: task.recurrence_rule?.interval || 1,
      recurrence_days_of_week: task.recurrence_rule?.daysOfWeek || [],
    });
    setIsDetailDialogOpen(false);
    setCreateStep(2);
    setIsDialogOpen(true);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Validate against dynamic statuses
    if (!isValidStatus(newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t,
      ),
    );

    try {
      // Passa updated_by para o trigger excluir quem fez a ação das notificações
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus as any,
          updated_by: profile?.user_id 
        })
        .eq("id", taskId);

      if (error) throw error;

      await addHistoryEntry(taskId, `Status alterado para ${getStatusName(newStatus)}`);

      // Recurring → spawn next occurrence atomically when moving to "done"
      if (
        newStatus === "done" &&
        task.is_recurring &&
        !task.next_occurrence_generated &&
        task.due_date &&
        task.recurrence_rule
      ) {
        const nextDue = computeNextDueDate(task.due_date, task.recurrence_rule);
        if (nextDue) {
          const { error: rpcError } = await supabase.rpc(
            "generate_next_recurring_task" as any,
            { p_task_id: taskId, p_next_due_date: nextDue }
          );
          if (rpcError) {
            // Rollback status (visual + DB)
            setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
            );
            await supabase.from("tasks").update({ status: task.status }).eq("id", taskId);
            toast({
              title: "Falha ao gerar próxima ocorrência",
              description: rpcError.message,
              variant: "destructive",
            });
            return;
          }
          toast({
            title: "🔁 Próxima ocorrência criada",
            description: formatDateBR(nextDue.split("T")[0]),
          });
          fetchTasks();
          return;
        }
      }

      toast({
        title: "Sucesso",
        description: `Tarefa movida para ${getStatusName(newStatus)}!`,
      });
    } catch (error: any) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: task.status } : t,
        ),
      );
      toast({
        title: "Erro ao mover tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sortedTasksByStatus = (status: string) => {
    const arr = filteredTasks.filter((task) => task.status === status);
    if (sortBy === 'recent') {
      return arr.sort((a, b) => {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return db - da;
      });
    }
    return arr.sort((a, b) => {
      // Ordenar por data de vencimento, mais recente primeiro
      // Se não tiver data, vai para o final
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter([]);
    setAssignedFilter([]);
    setClientFilter([]);
    setTypeFilter([]);
    setDueDateRange(undefined);
    setIncludeNoDueDate(false);
  };

  const toggleFilter = (
    current: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    setter(current.includes(value) ? current.filter((v) => v !== value) : [...current, value]);
  };

  const getFilterLabel = (selected: string[], allLabel: string, singular: string, plural: string) => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1) return `1 ${singular}`;
    return `${selected.length} ${plural}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão de Tarefas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Painel completo para gerenciamento e acompanhamento de tarefas</p>
        </div>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <QuickTemplatesDropdown
              templates={templates}
              onSelectTemplate={(template) => {
                applyTemplate(template);
                setIsDialogOpen(true);
              }}
              onOpenFullSelector={() => setIsTemplateSelectorOpen(true)}
            />
          )}
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setCreateStep(1);
              } else if (!selectedTask) {
                form.reset(taskFormDefaults);
                setCreateStep(1);
              }
            }}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nova Tarefa</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Nova Tarefa</DialogTitle>
              {createStep === 1 && (
                <DialogDescription>Use a IA para preencher automaticamente ou preencha manualmente.</DialogDescription>
              )}
            </DialogHeader>

            {/* Wizard Step Indicator - só mostra a partir do passo 2 */}
            {createStep > 1 && (
              <div className="flex-shrink-0 pb-2">
                <WizardStepIndicator
                  currentStep={createStep - 1}
                  totalSteps={3}
                  stepLabels={["Básico", "Detalhes", "Revisão"]}
                />
              </div>
            )}

            {/* Passo 1: IA */}
            {createStep === 1 && (
              <AIPreFillStep
                type="task"
                loading={aiLoading}
                onResult={() => {}}
                onSkip={() => setCreateStep(2)}
                onSubmit={async (text) => {
                  const result = await preFillTask(text, currentAgency?.id);
                  if (result) {
                    let matchedClientIds: string[] = [];
                    if (result.mentioned_clients?.length && clients.length > 0) {
                      const normalize = (s: string) =>
                        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      matchedClientIds = clients
                        .filter((c) =>
                          result.mentioned_clients!.some((mention) => {
                            const nMention = normalize(mention);
                            const nClient = normalize(c.name);
                            return nClient.includes(nMention) || nMention.includes(nClient);
                          })
                        )
                        .map((c) => c.id);
                    }
                    // Match fuzzy de usuários mencionados
                    let matchedUserIds: string[] = [];
                    if (result.mentioned_users?.length && profiles.length > 0) {
                      const normalize = (s: string) =>
                        s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      matchedUserIds = profiles
                        .filter((p) =>
                          result.mentioned_users!.some((mention) => {
                            const nMention = normalize(mention);
                            const nProfile = normalize(p.name);
                            return nProfile.includes(nMention) || nMention.includes(nProfile);
                          })
                        )
                        .map((p) => p.user_id);
                    }
                    // Guardrail 3: Use setValue to preserve user-filled fields
                    if (result.title) form.setValue("title", result.title, { shouldValidate: true });
                    if (result.description) form.setValue("description", result.description, { shouldValidate: true });
                    if (result.priority) form.setValue("priority", result.priority, { shouldValidate: true });
                    if (result.suggested_type) form.setValue("task_type", result.suggested_type, { shouldValidate: true });
                    if (matchedClientIds.length > 0) form.setValue("client_ids", matchedClientIds);
                    if (matchedUserIds.length > 0) form.setValue("assigned_users", matchedUserIds);
                    if (result.suggested_date) form.setValue("due_date", result.suggested_date.split("T")[0]);
                    if (result.platform) form.setValue("platform", result.platform);
                    if (result.post_type) form.setValue("post_type", result.post_type);
                    if (result.hashtags?.length) form.setValue("hashtags", result.hashtags.join(", "));
                    if (result.creative_instructions) form.setValue("creative_instructions", result.creative_instructions);
                    setCreateStep(2);
                  }
                }}
              />
            )}

            {/* Passo 2: Básico */}
            {createStep === 2 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    {templates.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTemplateSelectorOpen(true)}
                        className="flex items-center gap-2 justify-center border-dashed"
                      >
                        <FileText className="h-4 w-4" />
                        Usar Template
                      </Button>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="title">Título *</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => form.setValue("title", e.target.value)}
                        placeholder="Digite o título da tarefa"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => form.setValue("description", e.target.value)}
                        placeholder="Digite a descrição da tarefa"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task_type">Tipo *</Label>
                      <Select
                        value={newTask.task_type}
                        onValueChange={(value) => form.setValue("task_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {types.map((type) => (
                            <SelectItem key={type.slug} value={type.slug}>
                              {type.icon} {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Campos condicionais de Redes Sociais */}
                    {newTask.task_type === "redes_sociais" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Plataforma</Label>
                          <Select
                            value={newTask.platform}
                            onValueChange={(value) => form.setValue("platform", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a plataforma" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="instagram">Instagram</SelectItem>
                              <SelectItem value="facebook">Facebook</SelectItem>
                              <SelectItem value="linkedin">LinkedIn</SelectItem>
                              <SelectItem value="twitter">Twitter/X</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                              <SelectItem value="youtube">YouTube</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Tipo de Conteúdo</Label>
                          <Select
                            value={newTask.post_type}
                            onValueChange={(value) => form.setValue("post_type", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="feed">Feed</SelectItem>
                              <SelectItem value="stories">Stories</SelectItem>
                              <SelectItem value="reels">Reels</SelectItem>
                              <SelectItem value="carrossel">Carrossel</SelectItem>
                              <SelectItem value="video">Vídeo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCreateStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => {
                      if (!newTask.title.trim()) {
                        toast({ title: "Erro", description: "O título é obrigatório.", variant: "destructive" });
                        return;
                      }
                      if (!newTask.task_type) {
                        toast({ title: "Erro", description: "O tipo é obrigatório.", variant: "destructive" });
                        return;
                      }
                      setCreateStep(3);
                    }}
                  >
                    Próximo
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* Passo 3: Detalhes */}
            {createStep === 3 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={newTask.status}
                          onValueChange={(value: any) => form.setValue("status", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((status) => (
                              <SelectItem key={status.slug} value={status.slug}>
                                {status.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="priority">Prioridade</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value: any) => form.setValue("priority", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Data de Vencimento</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => form.setValue("due_date", e.target.value)}
                      />
                    </div>

                    <RecurrenceFields
                      values={{
                        is_recurring: newTask.is_recurring,
                        recurrence_frequency: newTask.recurrence_frequency,
                        recurrence_interval: newTask.recurrence_interval,
                        recurrence_days_of_week: newTask.recurrence_days_of_week,
                      }}
                      onChange={(patch) => {
                        Object.entries(patch).forEach(([k, v]) =>
                          form.setValue(k as any, v as any)
                        );
                      }}
                    />

                    {/* Campos condicionais de Redes Sociais */}
                    {newTask.task_type === "redes_sociais" && (
                      <>
                        <div className="grid gap-2">
                          <Label>Data de Publicação</Label>
                          <Input
                            type="date"
                            value={newTask.post_date}
                            onChange={(e) => form.setValue("post_date", e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Hashtags</Label>
                          <Input
                            value={newTask.hashtags}
                            onChange={(e) => form.setValue("hashtags", e.target.value)}
                            placeholder="Ex: #marketing, #design, #social"
                          />
                        </div>
                      </>
                    )}
                    {/* Instruções Criativas - para Redes Sociais e Criativos */}
                    {["redes_sociais", "criativos"].includes(newTask.task_type) && (
                      <div className="grid gap-2">
                        <Label>Instruções Criativas</Label>
                        <Textarea
                          value={newTask.creative_instructions}
                          onChange={(e) => form.setValue("creative_instructions", e.target.value)}
                          placeholder="Instruções de arte, roteiro, textos na arte, CTAs..."
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Clientes</Label>
                        <MultiClientSelector
                          clients={clients}
                          selectedClientIds={newTask.client_ids}
                          onSelectionChange={(ids) => form.setValue("client_ids", ids)}
                          placeholder="Selecionar clientes..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Atribuir usuários</Label>
                        <MultiUserSelector
                          users={profiles}
                          selectedUserIds={newTask.assigned_users}
                          onSelectionChange={(userIds) => form.setValue("assigned_users", userIds)}
                          placeholder="Selecionar usuários..."
                          emptyText="Nenhum usuário disponível."
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCreateStep(2)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setCreateStep(4)}>
                    Próximo
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* Passo 4: Revisão */}
            {createStep === 4 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <WizardReviewStep
                      fields={[
                        { label: "Título", value: newTask.title },
                        { label: "Tipo", value: types.find(t => t.slug === newTask.task_type)?.name ? `${types.find(t => t.slug === newTask.task_type)?.icon} ${types.find(t => t.slug === newTask.task_type)?.name}` : "" },
                        { label: "Descrição", value: newTask.description },
                        { label: "Status", value: statuses.find(s => s.slug === newTask.status)?.name || "" },
                        { label: "Prioridade", value: getPriorityLabel(newTask.priority) },
                        { label: "Data de Vencimento", value: newTask.due_date ? formatDateBR(newTask.due_date) : "" },
                        { label: "Clientes", value: newTask.client_ids.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(", ") },
                        { label: "Usuários", value: newTask.assigned_users.map(id => profiles.find(p => p.user_id === id)?.name).filter(Boolean).join(", ") },
                        ...(newTask.task_type === "redes_sociais" ? [
                          { label: "Plataforma", value: newTask.platform ? newTask.platform.charAt(0).toUpperCase() + newTask.platform.slice(1) : "" },
                          { label: "Tipo de Conteúdo", value: newTask.post_type ? newTask.post_type.charAt(0).toUpperCase() + newTask.post_type.slice(1) : "" },
                          { label: "Data de Publicação", value: newTask.post_date ? formatDateBR(newTask.post_date) : "" },
                          { label: "Hashtags", value: newTask.hashtags },
                        ] : []),
                        ...(["redes_sociais", "criativos"].includes(newTask.task_type) ? [
                          { label: "Instruções Criativas", value: newTask.creative_instructions },
                        ] : []),
                      ]}
                    />
                    <SubtaskManager
                      subtasks={newTask.subtasks}
                      onChange={(subtasks) => form.setValue("subtasks", subtasks)}
                    />
                    <div className="grid gap-2">
                      <Label>Anexos</Label>
                      <FileAttachments
                        attachments={newTask.attachments}
                        onChange={(attachments) => form.setValue("attachments", attachments)}
                        bucket="task-attachments"
                        entityId={selectedTask?.id}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setCreateStep(3)}>
                    Voltar
                  </Button>
                  <Button onClick={handleCreateTask}>
                    Criar Tarefa
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Tarefas</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Análises</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {/* Filtros responsivos */}
          <div className="space-y-3">
            {/* Linha 1: Busca */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Linha 2: Filtros com scroll horizontal */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />

              {/* Filtro de Prioridade - Multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0 justify-between font-normal", priorityFilter.length > 0 && "border-primary")}>
                    <span className="truncate">{getFilterLabel(priorityFilter, "Prioridade", "prioridade", "prioridades")}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: "high", label: "Alta" },
                          { value: "medium", label: "Média" },
                          { value: "low", label: "Baixa" },
                        ].map((item) => (
                          <CommandItem key={item.value} onSelect={() => toggleFilter(priorityFilter, setPriorityFilter, item.value)}>
                            <Check className={cn("mr-2 h-4 w-4", priorityFilter.includes(item.value) ? "opacity-100" : "opacity-0")} />
                            {item.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Filtro de Usuário - Multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0 justify-between font-normal", assignedFilter.length > 0 && "border-primary")}>
                    <span className="truncate">{getFilterLabel(assignedFilter, "Usuário", "usuário", "usuários")}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar usuário..." />
                    <CommandList>
                      <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem onSelect={() => toggleFilter(assignedFilter, setAssignedFilter, "unassigned")}>
                          <Check className={cn("mr-2 h-4 w-4", assignedFilter.includes("unassigned") ? "opacity-100" : "opacity-0")} />
                          Não atribuído
                        </CommandItem>
                        {profiles.map((p) => (
                          <CommandItem key={p.user_id} value={p.name} onSelect={() => toggleFilter(assignedFilter, setAssignedFilter, p.user_id)}>
                            <Check className={cn("mr-2 h-4 w-4", assignedFilter.includes(p.user_id) ? "opacity-100" : "opacity-0")} />
                            {p.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Filtro de Cliente - Multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] sm:w-[170px] h-9 text-xs sm:text-sm flex-shrink-0 justify-between font-normal", clientFilter.length > 0 && "border-primary")}>
                    <span className="truncate">{getFilterLabel(clientFilter, "Cliente", "cliente", "clientes")}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="Sem Cliente" onSelect={() => toggleFilter(clientFilter, setClientFilter, "no-client")}>
                          <Check className={cn("mr-2 h-4 w-4", clientFilter.includes("no-client") ? "opacity-100" : "opacity-0")} />
                          Sem Cliente
                        </CommandItem>
                        {clients.map((client) => (
                          <CommandItem key={client.id} value={client.name} onSelect={() => toggleFilter(clientFilter, setClientFilter, client.id)}>
                            <Check className={cn("mr-2 h-4 w-4", clientFilter.includes(client.id) ? "opacity-100" : "opacity-0")} />
                            {client.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Filtro de Tipo - Multi-select */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0 justify-between font-normal", typeFilter.length > 0 && "border-primary")}>
                    <span className="truncate">{getFilterLabel(typeFilter, "Tipo", "tipo", "tipos")}</span>
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {types.map((type) => (
                          <CommandItem key={type.slug} onSelect={() => toggleFilter(typeFilter, setTypeFilter, type.slug)}>
                            <Check className={cn("mr-2 h-4 w-4", typeFilter.includes(type.slug) ? "opacity-100" : "opacity-0")} />
                            {type.icon} {type.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex-shrink-0">
                <DateRangeFilterDialog
                  value={dueDateRange}
                  onChange={setDueDateRange}
                  includeNoDate={includeNoDueDate}
                  onIncludeNoDateChange={setIncludeNoDueDate}
                  defaultIncludeNoDate={false}
                  label="Período"
                  active={!!dueDateRange?.from || includeNoDueDate}
                />
              </div>

              {(searchTerm ||
                priorityFilter.length > 0 ||
                assignedFilter.length > 0 ||
                clientFilter.length > 0 ||
                typeFilter.length > 0 ||
                !!dueDateRange?.from ||
                includeNoDueDate !== false) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              )}

              <div className="flex-shrink-0">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'due_date' | 'recent')}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_date">Data de entrega</SelectItem>
                    <SelectItem value="recent">Últimas alterações</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                value={view}
                onValueChange={(v) => v && setView(v as 'kanban' | 'list')}
                className="ml-auto flex-shrink-0"
              >
                <ToggleGroupItem value="kanban" aria-label="Kanban" title="Kanban">
                  <LayoutDashboard className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="Lista" title="Lista">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {view === 'kanban' ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-6 overflow-x-auto pb-4">
                {statuses.map((status) => (
                  <KanbanColumn
                    key={status.slug}
                    id={status.slug}
                    title={status.name}
                    tasks={sortedTasksByStatus(status.slug)}
                    color={status.color}
                    count={sortedTasksByStatus(status.slug).length}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    getPriorityColor={getPriorityColor}
                    getPriorityLabel={getPriorityLabel}
                    getUrgencyLevel={getUrgencyLevel}
                    getAssignedUserName={() => ""}
                    getClientName={getClientName}
                    formatDateBR={formatDateBR}
                    getAssignedUsers={getAssignedUsers}
                    getTypeName={getTypeName}
                    getTypeShortName={getTypeShortName}
                    getTypeIcon={getTypeIcon}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeId ? (
                  <SortableTaskCard
                    task={tasks.find((task) => task.id === activeId)!}
                    onViewDetails={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    getPriorityColor={getPriorityColor}
                    getPriorityLabel={getPriorityLabel}
                    getUrgencyLevel={getUrgencyLevel}
                    getAssignedUserName={() => ""}
                    getClientName={getClientName}
                    formatDateBR={formatDateBR}
                    assignedUsers={activeId ? getAssignedUsers(activeId) : []}
                    getTypeName={getTypeName}
                    getTypeShortName={getTypeShortName}
                    getTypeIcon={getTypeIcon}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <TaskListView
              tasks={filteredTasks}
              sortBy={sortBy}
              statuses={statuses}
              getAssignedUsers={getAssignedUsers}
              getClientName={getClientName}
              getTypeIcon={getTypeIcon}
              getTypeShortName={getTypeShortName}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              formatDateBR={formatDateBR}
              onViewDetails={handleViewDetails}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              onToggleComplete={handleToggleTaskStatus}
            />
          )}
        </TabsContent>


        <TabsContent value="analytics" className="space-y-4">
          <TaskAnalytics
            tasks={filteredTasks}
            profiles={profiles}
            clients={clients}
            getAssignedUsers={getAssignedUsers}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Tabs defaultValue="templates" className="space-y-4">
            <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
              <TabsTrigger value="templates" className="flex-shrink-0 gap-1 md:gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="types" className="flex-shrink-0 gap-1 md:gap-2">
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Tipos</span>
              </TabsTrigger>
              <TabsTrigger value="statuses" className="flex-shrink-0 gap-1 md:gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <TaskTemplateManager />
            </TabsContent>
            <TabsContent value="types">
              <TaskTypeManager />
            </TabsContent>
            <TabsContent value="statuses">
              <TaskStatusManager />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>Atualize as informações da tarefa.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={newTask.title}
                onChange={(e) => form.setValue("title", e.target.value)}
                placeholder="Digite o título da tarefa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newTask.description}
                onChange={(e) => form.setValue("description", e.target.value)}
                placeholder="Digite a descrição da tarefa"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(value: any) => form.setValue("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.slug} value={status.slug}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Prioridade</Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value: any) => form.setValue("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-task_type">Tipo *</Label>
              <Select
                value={newTask.task_type}
                onValueChange={(value) => form.setValue("task_type", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.slug} value={type.slug}>
                      {type.icon} {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos condicionais de Redes Sociais na edição */}
            {newTask.task_type === "redes_sociais" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={newTask.platform}
                      onValueChange={(value) => form.setValue("platform", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo de Conteúdo</Label>
                    <Select
                      value={newTask.post_type}
                      onValueChange={(value) => form.setValue("post_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feed">Feed</SelectItem>
                        <SelectItem value="stories">Stories</SelectItem>
                        <SelectItem value="reels">Reels</SelectItem>
                        <SelectItem value="carrossel">Carrossel</SelectItem>
                        <SelectItem value="video">Vídeo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Data de Publicação</Label>
                  <Input
                    type="date"
                    value={newTask.post_date}
                    onChange={(e) => form.setValue("post_date", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Hashtags</Label>
                  <Input
                    value={newTask.hashtags}
                    onChange={(e) => form.setValue("hashtags", e.target.value)}
                    placeholder="Ex: #marketing, #design, #social"
                  />
                </div>
              </>
            )}
            {/* Instruções Criativas - para Redes Sociais e Criativos */}
            {["redes_sociais", "criativos"].includes(newTask.task_type) && (
              <div className="grid gap-2">
                <Label>Instruções Criativas</Label>
                <Textarea
                  value={newTask.creative_instructions}
                  onChange={(e) => form.setValue("creative_instructions", e.target.value)}
                  placeholder="Instruções de arte, roteiro, textos na arte, CTAs..."
                  rows={3}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-assigned_users">Atribuir usuários</Label>
                <MultiUserSelector
                  users={profiles}
                  selectedUserIds={newTask.assigned_users}
                  onSelectionChange={(userIds) => form.setValue("assigned_users", userIds)}
                  placeholder="Selecionar usuários..."
                  emptyText="Nenhum usuário disponível."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client_id">Clientes</Label>
                <MultiClientSelector
                  clients={clients}
                  selectedClientIds={newTask.client_ids}
                  onSelectionChange={(ids) => form.setValue("client_ids", ids)}
                  placeholder="Selecionar clientes..."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due_date">Data de Vencimento</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => form.setValue("due_date", e.target.value)}
              />
            </div>
            <RecurrenceFields
              values={{
                is_recurring: newTask.is_recurring,
                recurrence_frequency: newTask.recurrence_frequency,
                recurrence_interval: newTask.recurrence_interval,
                recurrence_days_of_week: newTask.recurrence_days_of_week,
              }}
              onChange={(patch) => {
                Object.entries(patch).forEach(([k, v]) =>
                  form.setValue(k as any, v as any)
                );
              }}
            />
            <SubtaskManager
              subtasks={newTask.subtasks}
              onChange={(subtasks) => form.setValue("subtasks", subtasks)}
            />
            <div className="grid gap-2">
              <Label>Anexos</Label>
              <FileAttachments
                attachments={newTask.attachments}
                onChange={(attachments) => form.setValue("attachments", attachments)}
                bucket="task-attachments"
              />
            </div>
          </div>
          </div>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTask}>Atualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailsDialog
        task={selectedTask}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        onDuplicate={handleDuplicateTask}
        getClientName={getClientName}
        getAssignedUsers={getAssignedUsers}
        onTaskUpdate={fetchTasks}
        taskType={selectedTask?.task_type}
        getTypeName={getTypeName}
        getTypeIcon={getTypeIcon}
      />

      {/* Template Selector Dialog */}
      <TemplateSelector
        open={isTemplateSelectorOpen}
        onOpenChange={setIsTemplateSelectorOpen}
        templates={templates}
        onSelectTemplate={applyTemplate}
      />
    </div>
  );
}
