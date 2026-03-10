import { useState, useEffect, useMemo } from "react";
import { Plus, Search, LayoutGrid, TrendingUp, Settings, FileText, Tag, Filter, X, Check, ChevronsUpDown } from "lucide-react";
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
  PointerSensor,
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

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    status: string;
    priority: "low" | "medium" | "high";
    assigned_to: string;
    assigned_users: string[];
    client_ids: string[];
    due_date: string;
    subtasks: Subtask[];
    attachments: Attachment[];
    task_type: string;
    platform: string;
    post_type: string;
    post_date: string;
    hashtags: string;
    creative_instructions: string;
  }>({
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
  });

  const { updateClientRelations } = useClientRelations();

  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const { assignUsersToTask } = useTaskAssignments();

  const { templates, incrementUsageCount } = useTaskTemplates();
  const { statuses, getStatusName, isValidStatus } = useTaskStatuses();
  const { types, getTypeName, getTypeShortName, getTypeIcon, isValidType } = useTaskTypes();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
        tolerance: 5,
      },
    }),
  );

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();

    // Arquivar tarefas concluídas há mais de 7 dias
    archiveOldCompletedTasks();
  }, [currentAgency?.id]);

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
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_clients(client_id)")
        .eq("agency_id", currentAgency.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Populate client_id from task_clients join table when tasks.client_id is null
      const enrichedTasks = (data || []).map((task: any) => ({
        ...task,
        client_id: task.client_id || task.task_clients?.[0]?.client_id || null,
      }));
      setTasks(enrichedTasks);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message,
        variant: "destructive",
      });
    }
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

      setNewTask({
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
      });
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

    setNewTask({
      title: replaceTemplateVariables(template.default_title, context),
      description: replaceTemplateVariables(template.default_description, context),
      status,
      priority: template.default_priority as "low" | "medium" | "high",
      assigned_to: "unassigned",
      assigned_users: template.auto_assign_creator && profile?.user_id 
        ? [profile.user_id] 
        : [],
      client_ids: template.default_client_id ? [template.default_client_id] : [],
      due_date: calculateDueDate(template.due_date_offset_days),
      subtasks: template.subtasks.map((st) => ({
        ...st,
        id: crypto.randomUUID(),
        completed: false,
      })),
      attachments: [],
      task_type: (template as any).default_task_type || "",
      platform: "",
      post_type: "",
      post_date: "",
      hashtags: "",
      creative_instructions: "",
    });

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
    setNewTask({
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
      };

      // Reset notification_sent_at if due_date changed
      if (newTask.due_date !== originalDueDate) {
        updates.notification_sent_at = null;
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", selectedTask.id);

      if (error) throw error;

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
    
    setNewTask({
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
    return filteredTasks
      .filter((task) => task.status === status)
      .sort((a, b) => {
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
                setNewTask({
                  title: "", description: "", status: "todo", priority: "medium",
                  assigned_to: "unassigned", assigned_users: [], client_ids: [],
                  due_date: "", subtasks: [], attachments: [], task_type: "",
                  platform: "", post_type: "", post_date: "", hashtags: "",
                  creative_instructions: "",
                });
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
                    setNewTask((prev) => ({
                      ...prev,
                      title: result.title || prev.title,
                      description: result.description || prev.description,
                      priority: result.priority || prev.priority,
                      task_type: result.suggested_type || prev.task_type,
                      client_ids: matchedClientIds.length > 0 ? matchedClientIds : prev.client_ids,
                      assigned_users: matchedUserIds.length > 0 ? matchedUserIds : prev.assigned_users,
                      ...(result.suggested_date ? { due_date: result.suggested_date.split("T")[0] } : {}),
                      ...(result.platform ? { platform: result.platform } : {}),
                      ...(result.post_type ? { post_type: result.post_type } : {}),
                      ...(result.hashtags?.length ? { hashtags: result.hashtags.join(", ") } : {}),
                      ...(result.creative_instructions ? { creative_instructions: result.creative_instructions } : {}),
                    }));
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
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Digite o título da tarefa"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Digite a descrição da tarefa"
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="task_type">Tipo *</Label>
                      <Select
                        value={newTask.task_type}
                        onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
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
                            onValueChange={(value) => setNewTask({ ...newTask, platform: value })}
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
                            onValueChange={(value) => setNewTask({ ...newTask, post_type: value })}
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
                          onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}
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
                          onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
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
                        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      />
                    </div>

                    {/* Campos condicionais de Redes Sociais */}
                    {newTask.task_type === "redes_sociais" && (
                      <>
                        <div className="grid gap-2">
                          <Label>Data de Publicação</Label>
                          <Input
                            type="date"
                            value={newTask.post_date}
                            onChange={(e) => setNewTask({ ...newTask, post_date: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Hashtags</Label>
                          <Input
                            value={newTask.hashtags}
                            onChange={(e) => setNewTask({ ...newTask, hashtags: e.target.value })}
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
                          onChange={(e) => setNewTask({ ...newTask, creative_instructions: e.target.value })}
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
                          onSelectionChange={(ids) => setNewTask({ ...newTask, client_ids: ids })}
                          placeholder="Selecionar clientes..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Atribuir usuários</Label>
                        <MultiUserSelector
                          users={profiles}
                          selectedUserIds={newTask.assigned_users}
                          onSelectionChange={(userIds) => setNewTask({ ...newTask, assigned_users: userIds })}
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
                      onChange={(subtasks) => setNewTask({ ...newTask, subtasks })}
                    />
                    <div className="grid gap-2">
                      <Label>Anexos</Label>
                      <FileAttachments
                        attachments={newTask.attachments}
                        onChange={(attachments) => setNewTask({ ...newTask, attachments })}
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
            </div>
          </div>

          {/* Kanban View */}
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
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Digite o título da tarefa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Digite a descrição da tarefa"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}
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
                  onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
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
                onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
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
                      onValueChange={(value) => setNewTask({ ...newTask, platform: value })}
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
                      onValueChange={(value) => setNewTask({ ...newTask, post_type: value })}
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
                    onChange={(e) => setNewTask({ ...newTask, post_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Hashtags</Label>
                  <Input
                    value={newTask.hashtags}
                    onChange={(e) => setNewTask({ ...newTask, hashtags: e.target.value })}
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
                  onChange={(e) => setNewTask({ ...newTask, creative_instructions: e.target.value })}
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
                  onSelectionChange={(userIds) => setNewTask({ ...newTask, assigned_users: userIds })}
                  placeholder="Selecionar usuários..."
                  emptyText="Nenhum usuário disponível."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client_id">Clientes</Label>
                <MultiClientSelector
                  clients={clients}
                  selectedClientIds={newTask.client_ids}
                  onSelectionChange={(ids) => setNewTask({ ...newTask, client_ids: ids })}
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
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
            <SubtaskManager
              subtasks={newTask.subtasks}
              onChange={(subtasks) => setNewTask({ ...newTask, subtasks })}
            />
            <div className="grid gap-2">
              <Label>Anexos</Label>
              <FileAttachments
                attachments={newTask.attachments}
                onChange={(attachments) => setNewTask({ ...newTask, attachments })}
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
