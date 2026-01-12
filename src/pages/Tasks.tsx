import { useState, useEffect, useMemo } from "react";
import { Plus, Search, LayoutGrid, TrendingUp, Settings, FileText } from "lucide-react";
import { SubtaskManager, Subtask } from "@/components/ui/subtask-manager";
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
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { MultiClientSelector } from "@/components/clients/MultiClientSelector";
import { TaskAnalytics } from "@/components/tasks/TaskAnalytics";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { TaskStatusManager } from "@/components/tasks/TaskStatusManager";
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
import { useClientRelations } from "@/hooks/useClientRelations";
import { replaceTemplateVariables, calculateDueDate } from "@/lib/templateVariables";

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

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);

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
  });

  const { updateClientRelations } = useClientRelations();

  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  const {
    assignments,
    loading: assignmentsLoading,
    fetchAssignments,
    assignUsersToTask,
    getAssignedUsers,
  } = useTaskAssignments();

  const { templates, incrementUsageCount } = useTaskTemplates();
  const { statuses, getStatusName, getStatusColor, isValidStatus } = useTaskStatuses();

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
    fetchAssignments();

    // Arquivar tarefas concluídas há mais de 7 dias
    archiveOldCompletedTasks();

    // Listener para mudanças nas atribuições
    const handleAssignmentsUpdate = () => {
      fetchTasks();
      fetchAssignments();
    };

    window.addEventListener('task-assignments-updated', handleAssignmentsUpdate);
    return () => {
      window.removeEventListener('task-assignments-updated', handleAssignmentsUpdate);
    };
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
        .select("*")
        .eq("agency_id", currentAgency.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks((data as any) || []);
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
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
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
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

      let matchesAssigned = true;
      if (assignedFilter !== "all") {
        const taskAssignedUsers = getAssignedUsers(task.id);
        if (assignedFilter === "unassigned") {
          matchesAssigned = taskAssignedUsers.length === 0;
        } else {
          matchesAssigned = taskAssignedUsers.some((u) => u.user_id === assignedFilter);
        }
      }

      const matchesClient =
        clientFilter === "all" || (clientFilter === "no-client" && !task.client_id) || task.client_id === clientFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesClient;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, assignedFilter, clientFilter, getAssignedUsers]);

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

  const getClientName = (clientId: string | null) => {
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

    try {
      const { data: taskData, error } = await supabase
        .from("tasks")
        .insert([{
          title: newTask.title,
          description: newTask.description,
          status: newTask.status as any,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
          client_id: newTask.client_ids[0] || null, // Keep first for backward compatibility
          due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
          created_by: profile?.user_id,
          agency_id: currentAgency?.id,
          subtasks: newTask.subtasks as any,
        }])
        .select()
        .single();

      if (error) throw error;

      if (newTask.assigned_users.length > 0 && taskData) {
        await assignUsersToTask(taskData.id, newTask.assigned_users);
      }

      // Create client relations
      if (taskData && newTask.client_ids.length > 0) {
        await updateClientRelations("task", taskData.id, newTask.client_ids);
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
    });

    incrementUsageCount(template.id);
    setIsTemplateSelectorOpen(false);
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
      client_ids: task.client_id ? [task.client_id] : [],
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
      subtasks: task.subtasks || [],
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

      const updates: any = {
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
        client_id: newTask.client_ids[0] || null,
        due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
        subtasks: newTask.subtasks as any,
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
    // Buscar os clientes e usuários atribuídos da tarefa original
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
    });
    setIsDetailDialogOpen(false);
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
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus as any })
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
    setPriorityFilter("all");
    setAssignedFilter("all");
    setClientFilter("all");
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Tarefas</h1>
          <p className="text-muted-foreground">Painel completo para gerenciamento e acompanhamento de tarefas</p>
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>Preencha as informações ou use um template.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Botão de Template */}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="assigned_users">Atribuir usuários</Label>
                  <MultiUserSelector
                    users={profiles}
                    selectedUserIds={newTask.assigned_users}
                    onSelectionChange={(userIds) => setNewTask({ ...newTask, assigned_users: userIds })}
                    placeholder="Selecionar usuários..."
                    emptyText="Nenhum usuário disponível."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Clientes</Label>
                  <MultiClientSelector
                    clients={clients}
                    selectedClientIds={newTask.client_ids}
                    onSelectionChange={(ids) => setNewTask({ ...newTask, client_ids: ids })}
                    placeholder="Selecionar clientes..."
                  />
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
              <SubtaskManager
                subtasks={newTask.subtasks}
                onChange={(subtasks) => setNewTask({ ...newTask, subtasks })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTask} style={{ backgroundColor: "#150a26", color: "white" }}>
                Criar Tarefa
              </Button>
            </DialogFooter>
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

        <TabsContent value="tasks" className="space-y-6">
          {/* Filtros simplificados */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.slug} value={status.slug}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Prioridades</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Usuários</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.user_id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm ||
              statusFilter !== "all" ||
              priorityFilter !== "all" ||
              assignedFilter !== "all" ||
              clientFilter !== "all") && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            )}
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
            <TabsList>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="statuses" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Status
              </TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <TaskTemplateManager />
            </TabsContent>
            <TabsContent value="statuses">
              <TaskStatusManager />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>Atualize as informações da tarefa.</DialogDescription>
          </DialogHeader>
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
          </div>
          <DialogFooter>
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
