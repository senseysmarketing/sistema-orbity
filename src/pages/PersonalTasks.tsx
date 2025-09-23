import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Clock, AlertCircle, CheckCircle, Building, Calendar, KanbanSquare, List, Filter, Target, TrendingUp, Activity, Timer, BarChart3, Edit, Trash2, Eye, MoreHorizontal, AlertTriangle, Users } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonalKanbanColumn } from "@/components/ui/personal-kanban-column";
import { SortablePersonalTaskCard } from "@/components/ui/sortable-personal-task-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PersonalTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: 'pending' | 'today' | 'overdue' | 'done';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  is_routine: boolean;
  due_date: string | null;
  client_id: string | null;
  created_at: string;
  user_id: string;
}

interface Client {
  id: string;
  name: string;
}

interface TaskForm {
  title: string;
  description: string;
  category: string;
  is_routine: boolean;
  due_date: Date | undefined;
  client_id: string;
}

export default function PersonalTasks() {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [routineFilter, setRoutineFilter] = useState<string>("all");
  const [dueDateFilter, setDueDateFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<PersonalTask | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [taskForm, setTaskForm] = useState<TaskForm>({
    title: "",
    description: "",
    category: "geral",
    is_routine: false,
    due_date: undefined,
    client_id: "no-client"
  });

  const { profile } = useAuth();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper function moved here to be available early
  const getTaskStatus = (task: any) => {
    if (task.completed) return 'done';
    
    const today = new Date();
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    
    if (dueDate && dueDate < today) return 'overdue';
    if (dueDate && dueDate.toDateString() === today.toDateString()) return 'today';
    
    return 'pending';
  };

  useEffect(() => {
    if (profile) {
      fetchPersonalTasks();
      fetchClients();
    }
  }, [profile]);

  const fetchPersonalTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_tasks')
        .select('*')
        .eq('user_id', profile?.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear dados para incluir status e priority virtuais
      const tasksWithVirtualFields = (data || []).map(task => ({
        ...task,
        status: getTaskStatus(task) as 'pending' | 'today' | 'overdue' | 'done',
        priority: 'medium' as 'low' | 'medium' | 'high' // Prioridade padrão para tarefas pessoais
      }));
      
      setTasks(tasksWithVirtualFields);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tarefas pessoais",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('active', true);

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('personal_tasks')
        .update({ completed: !completed })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed: !completed } : task
      ));

      toast({
        title: !completed ? "Tarefa concluída!" : "Tarefa reaberta",
        description: !completed 
          ? "Parabéns por completar mais uma tarefa!" 
          : "A tarefa foi marcada como pendente novamente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('personal_tasks')
        .insert({
          title: taskForm.title,
          description: taskForm.description || null,
          category: taskForm.category,
          is_routine: taskForm.is_routine,
          due_date: taskForm.due_date ? taskForm.due_date.toISOString() : null,
          client_id: taskForm.client_id === "no-client" ? null : taskForm.client_id,
          user_id: profile?.user_id,
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa criada com sucesso!",
      });

      resetForm();
      setIsCreateDialogOpen(false);
      fetchPersonalTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao criar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTask = (task: PersonalTask) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      is_routine: task.is_routine,
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      client_id: task.client_id || "no-client"
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !taskForm.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('personal_tasks')
        .update({
          title: taskForm.title,
          description: taskForm.description || null,
          category: taskForm.category,
          is_routine: taskForm.is_routine,
          due_date: taskForm.due_date ? taskForm.due_date.toISOString() : null,
          client_id: taskForm.client_id === "no-client" ? null : taskForm.client_id,
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa atualizada com sucesso!",
      });

      setIsEditDialogOpen(false);
      setSelectedTask(null);
      resetForm();
      fetchPersonalTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      const { error } = await supabase
        .from('personal_tasks')
        .delete()
        .eq('id', selectedTask.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tarefa excluída com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setSelectedTask(null);
      fetchPersonalTasks();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: "",
      description: "",
      category: "geral",
      is_routine: false,
      due_date: undefined,
      client_id: "no-client"
    });
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Cliente desconhecido';
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'design': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'trafego': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'administrativo': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pessoal': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'geral': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };


  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Baixa';
      case 'medium': return 'Média';
      case 'high': return 'Alta';
      default: return priority;
    }
  };

  const getUrgencyLevel = (task: PersonalTask) => {
    const today = new Date();
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    
    if (task.completed) {
      return { level: 'completed', label: 'Concluída', color: 'bg-green-500 text-white' };
    }
    
    if (dueDate && dueDate < today) {
      return { level: 'overdue', label: 'Atrasada', color: 'bg-red-500 text-white' };
    }
    
    if (task.is_routine) {
      return { level: 'routine', label: 'Rotina', color: 'bg-purple-500 text-white' };
    }
    
    if (dueDate && dueDate.toDateString() === today.toDateString()) {
      return { level: 'today', label: 'Hoje', color: 'bg-blue-500 text-white' };
    }
    
    return { level: 'normal', label: 'Normal', color: 'bg-gray-500 text-white' };
  };

  const formatDateBR = (value: string | null) => {
    if (!value) return '';
    const s = String(value);
    const date = s.includes('T') ? new Date(s) : new Date(`${s}T00:00:00`);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'today': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done': return 'Concluída';
      case 'overdue': return 'Atrasada';
      case 'today': return 'Hoje';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  // Dados filtrados
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'completed' && task.completed) ||
                           (statusFilter === 'pending' && !task.completed);
      
      const matchesClient = clientFilter === 'all' || 
                           (clientFilter === 'no-client' && !task.client_id) ||
                           task.client_id === clientFilter;
      
      const matchesRoutine = routineFilter === 'all' ||
                            (routineFilter === 'routine' && task.is_routine) ||
                            (routineFilter === 'normal' && !task.is_routine);
      
      let matchesDueDate = true;
      if (dueDateFilter !== 'all') {
        const today = new Date();
        const taskDueDate = task.due_date ? new Date(task.due_date) : null;
        
        switch (dueDateFilter) {
          case 'overdue':
            matchesDueDate = taskDueDate && taskDueDate < today && !task.completed;
            break;
          case 'today':
            matchesDueDate = taskDueDate && 
              taskDueDate.toDateString() === today.toDateString();
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
      
      return matchesSearch && matchesCategory && matchesStatus && matchesClient && matchesRoutine && matchesDueDate;
    });
  }, [tasks, searchTerm, categoryFilter, statusFilter, clientFilter, routineFilter, dueDateFilter]);

  // Analytics
  const analytics = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const completedTasks = tasks.filter(t => t.completed).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    const routineTasks = tasks.filter(t => t.is_routine).length;
    
    const overdueTasks = tasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate < today && !t.completed;
    }).length;
    
    const dueTodayTasks = tasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate.toDateString() === today.toDateString();
    }).length;
    
    const dueThisWeekTasks = tasks.filter(t => {
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      return dueDate && dueDate <= thisWeek && dueDate >= today;
    }).length;
    
    const completionRate = tasks.length > 0 ? 
      Math.round((completedTasks / tasks.length) * 100) : 0;
    
    // Estatísticas por categoria
    const categoryStats: { [key: string]: number } = {};
    tasks.forEach(task => {
      categoryStats[task.category] = (categoryStats[task.category] || 0) + 1;
    });
    
    return {
      total: tasks.length,
      completed: completedTasks,
      pending: pendingTasks,
      routine: routineTasks,
      overdue: overdueTasks,
      dueToday: dueTodayTasks,
      dueThisWeek: dueThisWeekTasks,
      completionRate,
      categoryStats
    };
  }, [tasks]);

  // Organizar tarefas por status para kanban
  const tasksByStatus = useMemo(() => {
    const statusGroups = {
      pending: filteredTasks.filter(t => !t.completed && getTaskStatus(t) === 'pending'),
      today: filteredTasks.filter(t => !t.completed && getTaskStatus(t) === 'today'),
      overdue: filteredTasks.filter(t => !t.completed && getTaskStatus(t) === 'overdue'),
      done: filteredTasks.filter(t => t.completed),
    };
    
    return statusGroups;
  }, [filteredTasks]);

  // Drag and Drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Mapear status do kanban para propriedades da tarefa
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let newCompleted = task.completed;

    if (newStatus === 'done') {
      newCompleted = true;
    } else if (['pending', 'today', 'overdue'].includes(newStatus)) {
      newCompleted = false;
    }

    // Atualizar no banco de dados
    updateTaskStatus(taskId, newCompleted);
  };

  const updateTaskStatus = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('personal_tasks')
        .update({ completed })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, completed } : task
      ));

      toast({
        title: completed ? "Tarefa concluída!" : "Tarefa reaberta",
        description: completed 
          ? "Parabéns por completar mais uma tarefa!" 
          : "A tarefa foi marcada como pendente novamente.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Tarefas Pessoais</h1>
          <p className="text-muted-foreground">
            Organize suas tarefas e acompanhe seu progresso pessoal
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}>
            {viewMode === "list" ? <KanbanSquare className="h-4 w-4" /> : <List className="h-4 w-4" />}
            {viewMode === "list" ? "Kanban" : "Lista"}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" style={{ backgroundColor: '#7dafd8', borderColor: '#7dafd8' }}>
                <Plus className="h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Adicione uma nova tarefa pessoal ao seu sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="Digite o título da tarefa"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Descreva a tarefa (opcional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select value={taskForm.category} onValueChange={(value) => setTaskForm({ ...taskForm, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Geral</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="trafego">Tráfego</SelectItem>
                        <SelectItem value="administrativo">Administrativo</SelectItem>
                        <SelectItem value="pessoal">Pessoal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client">Cliente</Label>
                    <Select value={taskForm.client_id} onValueChange={(value) => setTaskForm({ ...taskForm, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-client">Sem cliente</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Data de Vencimento</Label>
                  <DatePickerDemo 
                    date={taskForm.due_date} 
                    onDateChange={(date) => setTaskForm({ ...taskForm, due_date: date })} 
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="routine" 
                    checked={taskForm.is_routine}
                    onCheckedChange={(checked) => setTaskForm({ ...taskForm, is_routine: !!checked })}
                  />
                  <Label htmlFor="routine">Tarefa de rotina</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateTask}>
                  Criar Tarefa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tasks">Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Estatísticas principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Tarefas</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.routine} tarefas de rotina
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analytics.completed}</div>
                <p className="text-xs text-muted-foreground">
                  Taxa: {analytics.completionRate}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{analytics.pending}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.dueToday} vencem hoje
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.overdue}</div>
                <p className="text-xs text-muted-foreground">
                  Precisam de atenção
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress da semana */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Progresso de Conclusão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Taxa de Conclusão</span>
                  <span>{analytics.completionRate}%</span>
                </div>
                <Progress value={analytics.completionRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {analytics.completed} de {analytics.total} tarefas concluídas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          {analytics.overdue > 0 && (
            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  Atenção Necessária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-600">
                  Você tem {analytics.overdue} tarefa(s) atrasada(s) que precisam de atenção.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setDueDateFilter('overdue')}
                >
                  Ver Tarefas Atrasadas
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Buscar suas tarefas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="trafego">Tráfego</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="no-client">Sem cliente</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={routineFilter} onValueChange={setRoutineFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="routine">Rotina</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={dueDateFilter} onValueChange={setDueDateFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Prazo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="overdue">Atrasadas</SelectItem>
                      <SelectItem value="today">Hoje</SelectItem>
                      <SelectItem value="week">Esta semana</SelectItem>
                      <SelectItem value="no-date">Sem prazo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Mode Toggle e Tasks */}
          {viewMode === "list" ? (
            <div className="grid gap-4">
              {filteredTasks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                    <p className="text-muted-foreground text-center">
                      {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
                        ? "Tente ajustar os filtros para encontrar tarefas."
                        : "Comece criando sua primeira tarefa pessoal."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTasks.map((task) => (
                  <Card key={task.id} className={`hover:shadow-md transition-shadow ${task.completed ? 'opacity-75' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => toggleTaskCompletion(task.id, task.completed)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <CardTitle className={`text-lg ${task.completed ? 'line-through' : ''}`}>
                              {task.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 ml-4">
                              <Badge className={getCategoryColor(task.category)}>
                                {task.category.charAt(0).toUpperCase() + task.category.slice(1)}
                              </Badge>
                              <Badge className={getStatusColor(getTaskStatus(task))}>
                                {getStatusLabel(getTaskStatus(task))}
                              </Badge>
                              {task.is_routine && (
                                <Badge variant="outline">Rotina</Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedTask(task);
                                    setIsDetailDialogOpen(true);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {task.description && (
                            <CardDescription className={task.completed ? 'line-through' : ''}>
                              {task.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {getClientName(task.client_id) && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {getClientName(task.client_id)}
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Prazo: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Criado em: {new Date(task.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            // Kanban View
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">{filteredTasks.length} de {tasks.length} tarefas</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                    setClientFilter("all");
                    setRoutineFilter("all");
                    setDueDateFilter("all");
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PersonalKanbanColumn
                  id="pending"
                  title="Pendentes"
                  tasks={tasksByStatus.pending}
                  color="bg-yellow-500"
                  count={tasksByStatus.pending.length}
                  onViewDetails={(task) => {
                    setSelectedTask(task);
                    setIsDetailDialogOpen(true);
                  }}
                  onEdit={handleEditTask}
                  onDelete={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                      setSelectedTask(task);
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  getClientName={getClientName}
                  formatDateBR={formatDateBR}
                />
                
                <PersonalKanbanColumn
                  id="today"
                  title="Hoje"
                  tasks={tasksByStatus.today}
                  color="bg-blue-500"
                  count={tasksByStatus.today.length}
                  onViewDetails={(task) => {
                    setSelectedTask(task);
                    setIsDetailDialogOpen(true);
                  }}
                  onEdit={handleEditTask}
                  onDelete={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                      setSelectedTask(task);
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  getClientName={getClientName}
                  formatDateBR={formatDateBR}
                />
                
                <PersonalKanbanColumn
                  id="overdue"
                  title="Atrasadas"
                  tasks={tasksByStatus.overdue}
                  color="bg-red-500"
                  count={tasksByStatus.overdue.length}
                  onViewDetails={(task) => {
                    setSelectedTask(task);
                    setIsDetailDialogOpen(true);
                  }}
                  onEdit={handleEditTask}
                  onDelete={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                      setSelectedTask(task);
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  getClientName={getClientName}
                  formatDateBR={formatDateBR}
                />
                
                <PersonalKanbanColumn
                  id="done"
                  title="Concluídas"
                  tasks={tasksByStatus.done}
                  color="bg-green-500"
                  count={tasksByStatus.done.length}
                  onViewDetails={(task) => {
                    setSelectedTask(task);
                    setIsDetailDialogOpen(true);
                  }}
                  onEdit={handleEditTask}
                  onDelete={(taskId) => {
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                      setSelectedTask(task);
                      setIsDeleteDialogOpen(true);
                    }
                  }}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  getClientName={getClientName}
                  formatDateBR={formatDateBR}
                />
              </div>
              
              <DragOverlay>
                {activeId ? (
                  <SortablePersonalTaskCard
                    task={tasks.find(t => t.id === activeId)!}
                    onViewDetails={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    getPriorityColor={getPriorityColor}
                    getPriorityLabel={getPriorityLabel}
                    getUrgencyLevel={getUrgencyLevel}
                    getClientName={getClientName}
                    formatDateBR={formatDateBR}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Distribuição por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(analytics.categoryStats).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(count / analytics.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Produtividade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Taxa de Conclusão</span>
                  <span className="font-medium">{analytics.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tarefas de Rotina</span>
                  <span className="font-medium">{analytics.routine}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Vencem Esta Semana</span>
                  <span className="font-medium">{analytics.dueThisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Média por Categoria</span>
                  <span className="font-medium">
                    {Object.keys(analytics.categoryStats).length > 0 
                      ? Math.round(analytics.total / Object.keys(analytics.categoryStats).length)
                      : 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Faça alterações na sua tarefa pessoal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Digite o título da tarefa"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Descreva a tarefa (opcional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Categoria</Label>
                <Select value={taskForm.category} onValueChange={(value) => setTaskForm({ ...taskForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="trafego">Tráfego</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="pessoal">Pessoal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-client">Cliente</Label>
                <Select value={taskForm.client_id} onValueChange={(value) => setTaskForm({ ...taskForm, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-client">Sem cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Data de Vencimento</Label>
              <DatePickerDemo 
                date={taskForm.due_date} 
                onDateChange={(date) => setTaskForm({ ...taskForm, due_date: date })} 
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="edit-routine" 
                checked={taskForm.is_routine}
                onCheckedChange={(checked) => setTaskForm({ ...taskForm, is_routine: !!checked })}
              />
              <Label htmlFor="edit-routine">Tarefa de rotina</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleUpdateTask}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Tarefa</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Título</Label>
                <p className="text-lg font-semibold">{selectedTask.title}</p>
              </div>
              {selectedTask.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{selectedTask.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                  <Badge className={getCategoryColor(selectedTask.category)}>
                    {selectedTask.category.charAt(0).toUpperCase() + selectedTask.category.slice(1)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(getTaskStatus(selectedTask))}>
                    {getStatusLabel(getTaskStatus(selectedTask))}
                  </Badge>
                </div>
              </div>
              {selectedTask.client_id && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Cliente</Label>
                  <p className="text-sm">{getClientName(selectedTask.client_id)}</p>
                </div>
              )}
              {selectedTask.due_date && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
                  <p className="text-sm">{new Date(selectedTask.due_date).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Criado em</Label>
                <p className="text-sm">{new Date(selectedTask.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
              {selectedTask.is_routine && (
                <Badge variant="outline">Tarefa de Rotina</Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}