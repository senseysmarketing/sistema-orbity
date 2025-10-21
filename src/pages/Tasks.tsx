import { useState, useEffect, useMemo } from "react";
import { Plus, Search, LayoutGrid, TrendingUp, Settings } from "lucide-react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanColumn } from "@/components/ui/kanban-column";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { TaskAnalytics } from "@/components/tasks/TaskAnalytics";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { TaskStatusManager } from "@/components/tasks/TaskStatusManager";
import { SortableTaskCard } from "@/components/ui/sortable-task-card";
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
  assigned_to: string | null;
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
  const [activeId, setActiveId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "todo" as const,
    priority: "medium" as const,
    assigned_to: "unassigned",
    assigned_users: [] as string[],
    client_id: "no-client",
    due_date: ""
  });

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
        tolerance: 5
      }
    })
  );

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    fetchClients();
    fetchAssignments();
    
    // Arquivar tarefas concluídas há mais de 7 dias
    archiveOldCompletedTasks();
  }, []);

  const archiveOldCompletedTasks = async () => {
    if (!currentAgency) return;

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { error } = await supabase
        .from('tasks')
        .update({ archived: true })
        .eq('agency_id', currentAgency.id)
        .eq('status', 'done')
        .eq('archived', false)
        .lt('updated_at', sevenDaysAgo.toISOString());

      if (error) console.error('Error archiving old tasks:', error);
    } catch (error) {
      console.error('Error archiving old tasks:', error);
    }
  };

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

  // Dados filtrados
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

      let matchesAssigned = true;
      if (assignedFilter !== 'all') {
        const taskAssignedUsers = getAssignedUsers(task.id);
        if (assignedFilter === 'unassigned') {
          matchesAssigned = taskAssignedUsers.length === 0;
        } else {
          matchesAssigned = taskAssignedUsers.some(u => u.user_id === assignedFilter);
        }
      }

      const matchesClient = 
        clientFilter === 'all' ||
        (clientFilter === 'no-client' && !task.client_id) ||
        task.client_id === clientFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssigned && matchesClient;
    });

    return filtered;
  }, [tasks, searchTerm, statusFilter, priorityFilter, assignedFilter, clientFilter, getAssignedUsers]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      todo: 'A Fazer',
      in_progress: 'Em Andamento',
      em_revisao: 'Em Revisão',
      done: 'Concluída'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta'
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[priority] || 'bg-muted text-muted-foreground';
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
    if (task.status === 'done') {
      return { level: 'completed', label: 'Concluída', color: 'bg-green-500 text-white' };
    }

    if (!task.due_date) {
      return { level: 'normal', label: '', color: '' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);

    // Verifica se está atrasada (passou da data de vencimento)
    if (dueDate < today) {
      return { level: 'overdue', label: 'Atrasada', color: 'bg-red-500 text-white' };
    }

    // Verifica se vence hoje
    if (dueDate.getTime() === today.getTime()) {
      return { level: 'today', label: 'Hoje', color: 'bg-orange-500 text-white' };
    }

    // Verifica se vence esta semana (próximos 7 dias)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    if (dueDate > today && dueDate <= nextWeek) {
      return { level: 'this-week', label: 'Esta Semana', color: 'bg-blue-500 text-white' };
    }

    return { level: 'normal', label: '', color: '' };
  };

  const dateOnlyToISO = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const ts = Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0);
    return new Date(ts).toISOString();
  };

  const addHistoryEntry = async (taskId: string, action: string) => {
    // Histórico será implementado em uma migração futura
    console.log(`Task ${taskId}: ${action}`);
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
      const { data: taskData, error } = await supabase
        .from('tasks')
        .insert({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
          client_id: newTask.client_id === "no-client" ? null : newTask.client_id,
          due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null,
          created_by: profile?.user_id,
          agency_id: currentAgency?.id
        })
        .select()
        .single();

      if (error) throw error;

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
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to === "unassigned" ? null : newTask.assigned_to,
          client_id: newTask.client_id === "no-client" ? null : newTask.client_id,
          due_date: newTask.due_date ? dateOnlyToISO(newTask.due_date) : null
        })
        .eq('id', selectedTask.id);

      if (error) throw error;

      if (selectedTask) {
        await assignUsersToTask(selectedTask.id, newTask.assigned_users);
        await addHistoryEntry(selectedTask.id, 'Tarefa atualizada');
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
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    const validStatuses = ['todo', 'in_progress', 'em_revisao', 'done'];
    if (!validStatuses.includes(newStatus)) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks(prev => prev.map(t => 
      t.id === taskId 
        ? { ...t, status: newStatus as 'todo' | 'in_progress' | 'em_revisao' | 'done' } 
        : t
    ));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus as 'todo' | 'in_progress' | 'em_revisao' | 'done' })
        .eq('id', taskId);

      if (error) throw error;

      await addHistoryEntry(taskId, `Status alterado para ${getStatusLabel(newStatus)}`);

      toast({
        title: "Sucesso",
        description: `Tarefa movida para ${getStatusLabel(newStatus)}!`
      });
    } catch (error: any) {
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, status: task.status as 'todo' | 'in_progress' | 'em_revisao' | 'done' } 
          : t
      ));
      toast({
        title: "Erro ao mover tarefa",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sortedTasksByStatus = (status: string) => {
    return filteredTasks.filter(task => task.status === status);
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
          <p className="text-muted-foreground">
            Painel completo para gerenciamento e acompanhamento de tarefas
          </p>
        </div>
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
              <DialogDescription>
                Preencha as informações da nova tarefa.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  <Select value={newTask.status} onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}>
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
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
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
                  <Label htmlFor="client_id">Cliente</Label>
                  <Select value={newTask.client_id} onValueChange={(value) => setNewTask({ ...newTask, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
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
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTask} style={{ backgroundColor: '#150a26', color: 'white' }}>
                Criar Tarefa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="em_revisao">Em Revisão</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.user_id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all" || priorityFilter !== "all" || assignedFilter !== "all" || clientFilter !== "all") && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KanbanColumn
                id="todo"
                title="A Fazer"
                tasks={sortedTasksByStatus('todo')}
                color="bg-gray-500"
                count={sortedTasksByStatus('todo').length}
                onViewDetails={handleViewDetails}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getUrgencyLevel={getUrgencyLevel}
                getAssignedUserName={() => ''}
                getClientName={getClientName}
                formatDateBR={formatDateBR}
                getAssignedUsers={getAssignedUsers}
              />
              
              <KanbanColumn
                id="in_progress"
                title="Em Andamento"
                tasks={sortedTasksByStatus('in_progress')}
                color="bg-blue-500"
                count={sortedTasksByStatus('in_progress').length}
                onViewDetails={handleViewDetails}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getUrgencyLevel={getUrgencyLevel}
                getAssignedUserName={() => ''}
                getClientName={getClientName}
                formatDateBR={formatDateBR}
                getAssignedUsers={getAssignedUsers}
              />
              
              <KanbanColumn
                id="em_revisao"
                title="Em Revisão"
                tasks={sortedTasksByStatus('em_revisao')}
                color="bg-purple-500"
                count={sortedTasksByStatus('em_revisao').length}
                onViewDetails={handleViewDetails}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getUrgencyLevel={getUrgencyLevel}
                getAssignedUserName={() => ''}
                getClientName={getClientName}
                formatDateBR={formatDateBR}
                getAssignedUsers={getAssignedUsers}
              />
              
              <KanbanColumn
                id="done"
                title="Concluídas"
                tasks={sortedTasksByStatus('done')}
                color="bg-green-500"
                count={sortedTasksByStatus('done').length}
                onViewDetails={handleViewDetails}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                getPriorityColor={getPriorityColor}
                getPriorityLabel={getPriorityLabel}
                getUrgencyLevel={getUrgencyLevel}
                getAssignedUserName={() => ''}
                getClientName={getClientName}
                formatDateBR={formatDateBR}
                getAssignedUsers={getAssignedUsers}
              />
            </div>
            
            <DragOverlay>
              {activeId ? (
                <SortableTaskCard
                  task={tasks.find(task => task.id === activeId)!}
                  onViewDetails={() => {}}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  getAssignedUserName={() => ''}
                  getClientName={getClientName}
                  formatDateBR={formatDateBR}
                  assignedUsers={activeId ? getAssignedUsers(activeId) : []}
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <TaskAnalytics tasks={filteredTasks} profiles={profiles} clients={clients} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <TaskStatusManager />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Atualize as informações da tarefa.
            </DialogDescription>
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
                <Select value={newTask.status} onValueChange={(value: any) => setNewTask({ ...newTask, status: value })}>
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
                <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
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
                <Label htmlFor="edit-client_id">Cliente</Label>
                <Select value={newTask.client_id} onValueChange={(value) => setNewTask({ ...newTask, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
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
              <Label htmlFor="edit-due_date">Data de Vencimento</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTask}>
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailsDialog
        task={selectedTask}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onEdit={handleEditTask}
        onDelete={handleDeleteTask}
        getClientName={getClientName}
        getAssignedUsers={getAssignedUsers}
      />
    </div>
  );
}
