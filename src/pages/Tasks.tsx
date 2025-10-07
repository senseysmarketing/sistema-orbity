import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Users, Clock, AlertCircle, Building, Eye, Edit, Trash2, MoreHorizontal, CheckCircle, AlertTriangle, TrendingUp, Calendar, Target, BarChart3, Activity, Timer, UserCheck, Zap, ArrowUpDown, Archive } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/ui/kanban-column";
import { SortableTaskCard } from "@/components/ui/sortable-task-card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { TaskAssignedUsers } from "@/components/tasks/TaskAssignedUsers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useTaskAssignments } from "@/hooks/useTaskAssignments";
interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'em_revisao' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null; // Mantemos para compatibilidade
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  created_by: string;
  archived?: boolean;
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

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"due_date" | "priority">("due_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    assigned_to: "unassigned",
    // Mantemos para compatibilidade
    assigned_users: [] as string[],
    // Novo campo para múltiplos usuários
    client_id: "no-client",
    due_date: ""
  });
  const {
    profile
  } = useAuth();
  const {
    currentAgency
  } = useAgency();
  const {
    toast
  } = useToast();

  // Hook para gerenciar atribuições
  const {
    assignments,
    loading: assignmentsLoading,
    fetchAssignments,
    assignUsersToTask,
    getAssignedUsers,
    getTasksForUser
  } = useTaskAssignments();
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 3,
      tolerance: 5
    }
  }));
  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();
    fetchAssignments();
  }, []);
  const fetchTasks = async () => {
    if (!currentAgency) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const fetchProfiles = async () => {
    if (!currentAgency) return;
    
    try {
      // Buscar apenas usuários da agência atual através da tabela agency_users
      const { data: agencyUsers, error: agencyUsersError } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', currentAgency.id);
      
      if (agencyUsersError) throw agencyUsersError;
      
      const userIds = agencyUsers?.map(au => au.user_id) || [];
      
      if (userIds.length === 0) {
        setProfiles([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, role')
        .in('user_id', userIds);
      
      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar perfis:', error);
    }
  };
  const fetchClients = async () => {
    if (!currentAgency) {
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', currentAgency.id);
      
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados filtrados e ordenados
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      // Filtro de busca
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de status
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

      // Filtro de prioridade
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      // Filtro de responsável
      const matchesAssigned = assignedFilter === 'all' || assignedFilter === 'unassigned' && !task.assigned_to || task.assigned_to === assignedFilter;

      // Filtro de cliente
      const matchesClient = clientFilter === 'all' || clientFilter === 'no-client' && !task.client_id || task.client_id === clientFilter;

      // Filtro de data de vencimento
      let matchesDueDate = true;
      if (dueDateFilter !== 'all') {
        const today = new Date();
        const taskDueDate = task.due_date ? new Date(task.due_date) : null;
        switch (dueDateFilter) {
          case 'overdue':
            matchesDueDate = taskDueDate && taskDueDate < today && task.status !== 'done';
            break;
          case 'today':
            matchesDueDate = taskDueDate && taskDueDate.toDateString() === today.toDateString();
            break;
          case 'week':
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            matchesDueDate = taskDueDate && taskDueDate <= nextWeek && taskDueDate >= today;
            break;
          case 'no-date':
            matchesDueDate = !task.due_date;
            break;
        }
      }
      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesClient && matchesDueDate;
    });

    // Aplicar ordenação
    filtered.sort((a, b) => {
      if (sortBy === 'due_date') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'priority') {
        const priorityOrder = {
          high: 3,
          medium: 2,
          low: 1
        };
        const priorityA = priorityOrder[a.priority];
        const priorityB = priorityOrder[b.priority];
        return sortOrder === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      }
      return 0;
    });
    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, assignedFilter, clientFilter, dueDateFilter, sortBy, sortOrder]);

  // Análises e métricas
  const analytics = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const statusStats = {
      todo: filteredTasks.filter(t => t.status === 'todo').length,
      in_progress: filteredTasks.filter(t => t.status === 'in_progress').length,
      em_revisao: filteredTasks.filter(t => t.status === 'em_revisao').length,
      done: filteredTasks.filter(t => t.status === 'done').length
    };
    const priorityStats = {
      high: filteredTasks.filter(t => t.priority === 'high').length,
      medium: filteredTasks.filter(t => t.priority === 'medium').length,
      low: filteredTasks.filter(t => t.priority === 'low').length
    };
    const overdueTasks = filteredTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate < today && t.status !== 'done';
    }).length;
    const dueTodayTasks = filteredTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate.toDateString() === today.toDateString();
    }).length;
    const dueThisWeekTasks = filteredTasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate <= thisWeek && dueDate >= today;
    }).length;
    const unassignedTasks = filteredTasks.filter(t => !t.assigned_to).length;
    const completionRate = filteredTasks.length > 0 ? Math.round(statusStats.done / filteredTasks.length * 100) : 0;

    // Análise por usuário
    const userStats: {
      [key: string]: {
        name: string;
        total: number;
        completed: number;
        pending: number;
      };
    } = {};
    profiles.forEach(profile => {
      const userTasks = filteredTasks.filter(t => t.assigned_to === profile.user_id);
      if (userTasks.length > 0) {
        userStats[profile.user_id] = {
          name: profile.name,
          total: userTasks.length,
          completed: userTasks.filter(t => t.status === 'done').length,
          pending: userTasks.filter(t => t.status !== 'done').length
        };
      }
    });

    // Análise por cliente
    const clientStats: {
      [key: string]: number;
    } = {};
    clients.forEach(client => {
      const clientTasks = filteredTasks.filter(t => t.client_id === client.id);
      if (clientTasks.length > 0) {
        clientStats[client.id] = clientTasks.length;
      }
    });
    return {
      total: filteredTasks.length,
      statusStats,
      priorityStats,
      overdueTasks,
      dueTodayTasks,
      dueThisWeekTasks,
      unassignedTasks,
      completionRate,
      userStats,
      clientStats
    };
  }, [filteredTasks, profiles, clients]);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'em_revisao':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'A Fazer';
      case 'in_progress':
        return 'Em Andamento';
      case 'em_revisao':
        return 'Em Revisão';
      case 'done':
        return 'Concluída';
      default:
        return status;
    }
  };
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'Baixa';
      case 'medium':
        return 'Média';
      case 'high':
        return 'Alta';
      default:
        return priority;
    }
  };
  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return 'Não atribuído';
    const user = profiles.find(p => p.user_id === userId);
    return user?.name || 'Usuário desconhecido';
  };
  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'Sem cliente';
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };
  const formatDateBR = (value: string | null) => {
    if (!value) return '';
    const s = String(value);
    const date = s.includes('T') ? new Date(s) : new Date(`${s}T00:00:00`);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  };
  const getUrgencyLevel = (task: Task) => {
    const today = new Date();
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    if (task.status === 'done') {
      return {
        level: 'completed',
        label: 'Concluída',
        color: 'bg-green-500 text-white'
      };
    }
    if (dueDate && dueDate < today) {
      return {
        level: 'overdue',
        label: 'Atrasada',
        color: 'bg-red-500 text-white'
      };
    }
    if (task.priority === 'high') {
      return {
        level: 'urgent',
        label: 'Urgente',
        color: 'bg-orange-500 text-white'
      };
    }
    if (dueDate && dueDate.toDateString() === today.toDateString()) {
      return {
        level: 'today',
        label: 'Hoje',
        color: 'bg-blue-500 text-white'
      };
    }
    return {
      level: 'normal',
      label: 'Normal',
      color: 'bg-gray-500 text-white'
    };
  };
  const dateOnlyToISO = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const ts = Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0);
    return new Date(ts).toISOString();
  };
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        data: taskData,
        error
      } = await supabase.from('tasks').insert({
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
        client_id: newTask.client_id === "no-client" ? null : newTask.client_id,
        due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
        created_by: profile?.user_id,
        agency_id: currentAgency?.id
      }).select().single();
      if (error) throw error;

      // Atribuir usuários à tarefa
      if (newTask.assigned_users.length > 0 && taskData) {
        await assignUsersToTask(taskData.id, newTask.assigned_users);
      }
      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!"
      });
      setNewTask({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assigned_to: "unassigned",
        assigned_users: [],
        client_id: "no-client",
        due_date: ""
      });
      setIsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setNewTask({
      title: task.title,
      description: task.description || "",
      status: task.status as any,
      priority: task.priority as any,
      assigned_to: task.assigned_to || "unassigned",
      assigned_users: getAssignedUsers(task.id).map(u => u.user_id),
      client_id: task.client_id || "no-client",
      due_date: task.due_date ? task.due_date.split('T')[0] : ""
    });
    setIsEditDialogOpen(true);
  };
  const handleUpdateTask = async () => {
    if (!selectedTask || !newTask.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('tasks').update({
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
        client_id: newTask.client_id === "no-client" ? null : newTask.client_id,
        due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null
      }).eq('id', selectedTask.id);
      if (error) throw error;

      // Atualizar usuários atribuídos à tarefa
      if (selectedTask) {
        await assignUsersToTask(selectedTask.id, newTask.assigned_users);
      }
      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!"
      });
      setIsEditDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeleteTask = async (taskId: string) => {
    try {
      const {
        error
      } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!"
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailDialogOpen(true);
  };
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssignedFilter("all");
    setClientFilter("all");
    setDueDateFilter("all");
  };
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Verificar se o status é válido
    const validStatuses = ['todo', 'in_progress', 'em_revisao', 'done'];
    if (!validStatuses.includes(newStatus)) return;

    // Encontrar a tarefa
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Atualizar localmente primeiro para feedback imediato
    setTasks(prev => prev.map(t => t.id === taskId ? {
      ...t,
      status: newStatus as 'todo' | 'in_progress' | 'em_revisao' | 'done'
    } : t));
    try {
      const {
        error
      } = await supabase.from('tasks').update({
        status: newStatus as 'todo' | 'in_progress' | 'em_revisao' | 'done'
      }).eq('id', taskId);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: `Tarefa movida para ${getStatusLabel(newStatus)}!`
      });
    } catch (error: any) {
      // Reverter mudança em caso de erro
      setTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        status: task.status as 'todo' | 'in_progress' | 'em_revisao' | 'done'
      } : t));
      toast({
        title: "Erro ao mover tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleArchiveCompleted = async () => {
    const completedTasks = tasks.filter(task => task.status === 'done');
    if (completedTasks.length === 0) {
      toast({
        title: "Nenhuma tarefa para arquivar",
        description: "Não há tarefas concluídas para arquivar.",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('tasks').update({
        archived: true
      }).eq('status', 'done');
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: `${completedTasks.length} tarefas concluídas foram arquivadas!`
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao arquivar tarefas",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const sortedTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Tarefas</h1>
          <p className="text-muted-foreground">
            Painel completo para gerenciamento e acompanhamento de tarefas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="action" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Criar Nova Tarefa</DialogTitle>
              <DialogDescription>
                Preencha as informações da nova tarefa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={newTask.title} onChange={e => setNewTask({
                ...newTask,
                title: e.target.value
              })} placeholder="Digite o título da tarefa" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={newTask.description} onChange={e => setNewTask({
                ...newTask,
                description: e.target.value
              })} placeholder="Digite a descrição da tarefa" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={newTask.status} onValueChange={(value: any) => setNewTask({
                  ...newTask,
                  status: value
                })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="todo">A Fazer</SelectItem>
                       <SelectItem value="in_progress">Em Andamento</SelectItem>
                       <SelectItem value="em_revisao">Em Revisão</SelectItem>
                       <SelectItem value="done">Concluída</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({
                  ...newTask,
                  priority: value
                })}>
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
                  <MultiUserSelector users={profiles} selectedUserIds={newTask.assigned_users} onSelectionChange={userIds => setNewTask({
                  ...newTask,
                  assigned_users: userIds
                })} placeholder="Selecionar usuários..." emptyText="Nenhum usuário disponível." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="client_id">Cliente</Label>
                  <Select value={newTask.client_id} onValueChange={value => setNewTask({
                  ...newTask,
                  client_id: value
                })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-client">Sem cliente</SelectItem>
                      {clients.map(client => <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input id="due_date" type="date" value={newTask.due_date} onChange={e => setNewTask({
                ...newTask,
                due_date: e.target.value
              })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="create" onClick={handleCreateTask}>
                Criar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Estatísticas Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.completionRate}% concluídas
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.overdueTasks}</div>
                <p className="text-xs text-muted-foreground">
                  precisam atenção urgente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo Hoje</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{analytics.dueTodayTasks}</div>
                <p className="text-xs text-muted-foreground">
                  para finalizar hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sem Responsável</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{analytics.unassignedTasks}</div>
                <p className="text-xs text-muted-foreground">
                  aguardando atribuição
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      A Fazer
                    </span>
                    <span>{analytics.statusStats.todo}</span>
                  </div>
                  <Progress value={analytics.statusStats.todo / analytics.total * 100} className="h-2" />
                </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-blue-500 rounded"></div>
                       Em Andamento
                     </span>
                     <span>{analytics.statusStats.in_progress}</span>
                   </div>
                   <Progress value={analytics.statusStats.in_progress / analytics.total * 100} className="h-2" />
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-purple-500 rounded"></div>
                       Em Revisão
                     </span>
                     <span>{analytics.statusStats.em_revisao}</span>
                   </div>
                   <Progress value={analytics.statusStats.em_revisao / analytics.total * 100} className="h-2" />
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-green-500 rounded"></div>
                       Concluídas
                     </span>
                     <span>{analytics.statusStats.done}</span>
                   </div>
                   <Progress value={analytics.statusStats.done / analytics.total * 100} className="h-2" />
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Distribuição por Prioridade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      Alta
                    </span>
                    <span>{analytics.priorityStats.high}</span>
                  </div>
                  <Progress value={analytics.priorityStats.high / analytics.total * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      Média
                    </span>
                    <span>{analytics.priorityStats.medium}</span>
                  </div>
                  <Progress value={analytics.priorityStats.medium / analytics.total * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      Baixa
                    </span>
                    <span>{analytics.priorityStats.low}</span>
                  </div>
                  <Progress value={analytics.priorityStats.low / analytics.total * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          {/* Filtros e Busca */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros e Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar tarefas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">Todos os Status</SelectItem>
                     <SelectItem value="todo">A Fazer</SelectItem>
                     <SelectItem value="in_progress">Em Andamento</SelectItem>
                     <SelectItem value="em_revisao">Em Revisão</SelectItem>
                     <SelectItem value="done">Concluída</SelectItem>
                   </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Responsáveis</SelectItem>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {profiles.map(profile => <SelectItem key={profile.id} value={profile.user_id}>
                        {profile.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>

                <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Vencimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Datas</SelectItem>
                    <SelectItem value="overdue">Atrasadas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Esta Semana</SelectItem>
                    <SelectItem value="no-date">Sem Data</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {filteredTasks.length} de {tasks.length} tarefas
                </p>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: "due_date" | "priority") => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_date">Data de Vencimento</SelectItem>
                      <SelectItem value="priority">Prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm" onClick={handleArchiveCompleted} className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Arquivar
                  </Button>
                  
                  <Button variant={viewMode === 'kanban' ? 'action' : 'outline'} size="sm" onClick={() => setViewMode('kanban')}>
                    Kanban
                  </Button>
                  <Button variant={viewMode === 'list' ? 'action' : 'outline'} size="sm" onClick={() => setViewMode('list')}>
                    Lista
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visualizações das Tarefas */}
          {filteredTasks.length === 0 ? <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {tasks.length === 0 ? 'Nenhuma tarefa encontrada' : 'Nenhum resultado encontrado'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {tasks.length === 0 ? 'Comece criando a primeira tarefa para sua equipe.' : 'Tente ajustar os filtros para ver mais resultados.'}
                </p>
              </CardContent>
            </Card> : viewMode === 'kanban' ? (/* Visualização Kanban */
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <KanbanColumn id="todo" title="A Fazer" tasks={sortedTasksByStatus('todo')} color="bg-gray-500" count={analytics.statusStats.todo} onViewDetails={handleViewDetails} onEdit={handleEditTask} onDelete={handleDeleteTask} getPriorityColor={getPriorityColor} getPriorityLabel={getPriorityLabel} getUrgencyLevel={getUrgencyLevel} getAssignedUserName={getAssignedUserName} getClientName={getClientName} formatDateBR={formatDateBR} getAssignedUsers={getAssignedUsers} />
                
                <KanbanColumn id="in_progress" title="Em Andamento" tasks={sortedTasksByStatus('in_progress')} color="bg-blue-500" count={analytics.statusStats.in_progress} onViewDetails={handleViewDetails} onEdit={handleEditTask} onDelete={handleDeleteTask} getPriorityColor={getPriorityColor} getPriorityLabel={getPriorityLabel} getUrgencyLevel={getUrgencyLevel} getAssignedUserName={getAssignedUserName} getClientName={getClientName} formatDateBR={formatDateBR} getAssignedUsers={getAssignedUsers} />
                
                <KanbanColumn id="em_revisao" title="Em Revisão" tasks={sortedTasksByStatus('em_revisao')} color="bg-purple-500" count={analytics.statusStats.em_revisao} onViewDetails={handleViewDetails} onEdit={handleEditTask} onDelete={handleDeleteTask} getPriorityColor={getPriorityColor} getPriorityLabel={getPriorityLabel} getUrgencyLevel={getUrgencyLevel} getAssignedUserName={getAssignedUserName} getClientName={getClientName} formatDateBR={formatDateBR} getAssignedUsers={getAssignedUsers} />
                
                <KanbanColumn id="done" title="Concluídas" tasks={sortedTasksByStatus('done')} color="bg-green-500" count={analytics.statusStats.done} onViewDetails={handleViewDetails} onEdit={handleEditTask} onDelete={handleDeleteTask} getPriorityColor={getPriorityColor} getPriorityLabel={getPriorityLabel} getUrgencyLevel={getUrgencyLevel} getAssignedUserName={getAssignedUserName} getClientName={getClientName} formatDateBR={formatDateBR} getAssignedUsers={getAssignedUsers} />
              </div>
              
              <DragOverlay>
                {activeId ? <SortableTaskCard task={tasks.find(task => task.id === activeId)!} onViewDetails={() => {}} onEdit={() => {}} onDelete={() => {}} getPriorityColor={getPriorityColor} getPriorityLabel={getPriorityLabel} getUrgencyLevel={getUrgencyLevel} getAssignedUserName={getAssignedUserName} getClientName={getClientName} formatDateBR={formatDateBR} assignedUsers={activeId ? getAssignedUsers(activeId) : []} /> : null}
              </DragOverlay>
            </DndContext>) : (/* Visualização Lista */
        <div className="grid gap-4">
              {filteredTasks.map(task => {
            const urgency = getUrgencyLevel(task);
            return <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Header com título e urgência */}
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1 mr-4">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{task.title}</h3>
                              <Badge className={urgency.color} variant="secondary">
                                {urgency.label}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Badge className={getStatusColor(task.status)}>
                                {getStatusLabel(task.status)}
                              </Badge>
                              <Badge className={getPriorityColor(task.priority)}>
                                {getPriorityLabel(task.priority)}
                              </Badge>
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewDetails(task)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Informações principais */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-muted-foreground">Responsáveis:</span>
                            <div className="mt-1">
                              <TaskAssignedUsers users={getAssignedUsers(task.id)} maxDisplay={4} size="sm" />
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Cliente:</span>
                            <p className="font-semibold">
                              {getClientName(task.client_id)}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground">Vencimento:</span>
                            <p className="font-semibold">
                              {task.due_date ? formatDateBR(task.due_date) : 'Sem data'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Descrição */}
                        {task.description && <div>
                            <span className="font-medium text-muted-foreground text-sm">Descrição:</span>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                          </div>}
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div>)}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Insights e Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {analytics.overdueTasks > 0 && <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-300">Tarefas Atrasadas</p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {analytics.overdueTasks} tarefas estão atrasadas e precisam de atenção imediata.
                        </p>
                      </div>
                    </div>}
                  
                  {analytics.dueTodayTasks > 0 && <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-700 dark:text-orange-300">Vencendo Hoje</p>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                          {analytics.dueTodayTasks} tarefas vencem hoje e precisam ser priorizadas.
                        </p>
                      </div>
                    </div>}
                  
                  {analytics.unassignedTasks > 0 && <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">Sem Responsável</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {analytics.unassignedTasks} tarefas ainda não foram atribuídas a ninguém.
                        </p>
                      </div>
                    </div>}
                  
                  {analytics.completionRate >= 70 && <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-300">Ótimo Progresso!</p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Taxa de conclusão de {analytics.completionRate}%. A equipe está performando bem!
                        </p>
                      </div>
                    </div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Próximos Vencimentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredTasks.filter(task => task.due_date && task.status !== 'done').sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()).slice(0, 5).map(task => {
                const urgency = getUrgencyLevel(task);
                return <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${urgency.level === 'overdue' ? 'bg-red-500' : urgency.level === 'today' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {getAssignedUserName(task.assigned_to)} • {formatDateBR(task.due_date)}
                            </p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(task.priority)} variant="outline">
                          {getPriorityLabel(task.priority)}
                        </Badge>
                      </div>;
              })}
                
                {filteredTasks.filter(task => task.due_date && task.status !== 'done').length === 0 && <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa pendente</h3>
                    <p className="text-muted-foreground">
                      Todas as tarefas com prazo estão concluídas!
                    </p>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Performance da Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(analytics.userStats).map(([userId, stats]) => <div key={userId} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{stats.name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{stats.completed}/{stats.total} concluídas</span>
                      <span>({stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}%)</span>
                    </div>
                  </div>
                  <Progress value={stats.total > 0 ? stats.completed / stats.total * 100 : 0} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stats.pending} pendentes</span>
                    <span>{stats.completed} finalizadas</span>
                  </div>
                </div>)}
              
              {Object.keys(analytics.userStats).length === 0 && <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa atribuída</h3>
                  <p className="text-muted-foreground">
                    Comece atribuindo tarefas aos membros da equipe.
                  </p>
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs de Edição e Detalhes */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Modifique as informações da tarefa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input id="edit-title" value={newTask.title} onChange={e => setNewTask({
              ...newTask,
              title: e.target.value
            })} placeholder="Digite o título da tarefa" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea id="edit-description" value={newTask.description} onChange={e => setNewTask({
              ...newTask,
              description: e.target.value
            })} placeholder="Digite a descrição da tarefa" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={newTask.status} onValueChange={(value: any) => setNewTask({
                ...newTask,
                status: value
              })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="todo">A Fazer</SelectItem>
                     <SelectItem value="in_progress">Em Andamento</SelectItem>
                     <SelectItem value="em_revisao">Em Revisão</SelectItem>
                     <SelectItem value="done">Concluída</SelectItem>
                   </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-priority">Prioridade</Label>
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({
                ...newTask,
                priority: value
              })}>
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
                <MultiUserSelector users={profiles} selectedUserIds={newTask.assigned_users} onSelectionChange={userIds => setNewTask({
                ...newTask,
                assigned_users: userIds
              })} placeholder="Selecionar usuários..." emptyText="Nenhum usuário disponível." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client_id">Cliente</Label>
                <Select value={newTask.client_id} onValueChange={value => setNewTask({
                ...newTask,
                client_id: value
              })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-client">Sem cliente</SelectItem>
                    {clients.map(client => <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-due_date">Data de Vencimento</Label>
              <Input id="edit-due_date" type="date" value={newTask.due_date} onChange={e => setNewTask({
              ...newTask,
              due_date: e.target.value
            })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="create" onClick={handleUpdateTask}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
            <DialogDescription>
              Informações completas sobre a tarefa
            </DialogDescription>
          </DialogHeader>
          {selectedTask && <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
                <div className="flex gap-2 mt-2">
                  <Badge className={getStatusColor(selectedTask.status)}>
                    {getStatusLabel(selectedTask.status)}
                  </Badge>
                  <Badge className={getPriorityColor(selectedTask.priority)}>
                    {getPriorityLabel(selectedTask.priority)}
                  </Badge>
                </div>
              </div>

              {selectedTask.description && <div>
                  <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm mt-1">{selectedTask.description}</p>
                </div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Responsável</label>
                  <div className="mt-1">
                    <TaskAssignedUsers users={getAssignedUsers(selectedTask.id)} showNames maxDisplay={5} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                  <p className="text-sm mt-1">{getClientName(selectedTask.client_id)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                  <p className="text-sm mt-1">{selectedTask.due_date ? formatDateBR(selectedTask.due_date) : 'Sem data definida'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Criada em</label>
                  <p className="text-sm mt-1">{formatDateBR(selectedTask.created_at)}</p>
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
}