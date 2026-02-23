import { useState, useMemo } from "react";
import { useSocialMediaTasks, SocialMediaTask } from "@/hooks/useSocialMediaTasks";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, parseISO, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { PlanningMetrics } from "./planning/PlanningMetrics";
import { ClientWeekRow } from "./planning/ClientWeekRow";
import { ClientPlanningDetails } from "./planning/ClientPlanningDetails";
import { ClientWeekPlan, ReadinessFilter, categorizeStatus } from "./planning/types";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function WeeklyPlanningView() {
  const { allTasks, loading: postsLoading } = useSocialMediaTasks();
  const { currentAgency } = useAgency();
  const navigate = useNavigate();
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>("all");
  const [selectedPlan, setSelectedPlan] = useState<ClientWeekPlan | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SocialMediaTask | null>(null);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-planning', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', currentAgency.id)
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  const weekDays = useMemo(() => 
    eachDayOfInterval({
      start: currentWeekStart,
      end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    }),
    [currentWeekStart]
  );

  const clientPlans = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    const today = new Date();

    const weekPosts = allTasks.filter(task => {
      const postDate = task.post_date || task.scheduled_date;
      if (!postDate) return false;
      const date = parseISO(postDate);
      return date >= currentWeekStart && date <= weekEnd;
    });

    const planMap = new Map<string, ClientWeekPlan>();

    clients.forEach(client => {
      planMap.set(client.id, {
        clientId: client.id,
        clientName: client.name,
        days: {},
        weekTotal: 0,
        readyCount: 0,
        readinessPercentage: 0,
        hasOverdue: false,
        platforms: [],
        contentTypes: [],
        assignedUsers: [],
        nearestDueDate: null,
        hasUrgentDeadline: false,
      });
    });

    const clientAggregates = new Map<string, {
      platforms: Set<string>;
      contentTypes: Set<string>;
      usersMap: Map<string, { userId: string; name: string; count: number }>;
      nearestDueDate: Date | null;
    }>();

    clients.forEach(client => {
      clientAggregates.set(client.id, {
        platforms: new Set(),
        contentTypes: new Set(),
        usersMap: new Map(),
        nearestDueDate: null,
      });
    });

    weekPosts.forEach(task => {
      if (!task.client_id) return;
      
      const plan = planMap.get(task.client_id);
      const aggregate = clientAggregates.get(task.client_id);
      if (!plan || !aggregate) return;

      const postDate = task.post_date || task.scheduled_date;
      const dateKey = format(parseISO(postDate), 'yyyy-MM-dd');
      
      if (!plan.days[dateKey]) {
        plan.days[dateKey] = { posts: [], ready: 0, inProgress: 0, draft: 0 };
      }

      plan.days[dateKey].posts.push(task);
      plan.weekTotal++;

      const category = categorizeStatus(task.status);
      if (category === 'ready') {
        plan.days[dateKey].ready++;
        plan.readyCount++;
      } else if (category === 'inProgress') {
        plan.days[dateKey].inProgress++;
      } else {
        plan.days[dateKey].draft++;
      }

      const postDateObj = parseISO(postDate);
      if (postDateObj < today && category !== 'ready') {
        plan.hasOverdue = true;
      }

      if (task.platform) aggregate.platforms.add(task.platform);
      if (task.post_type) aggregate.contentTypes.add(task.post_type);

      task.assigned_users?.forEach(user => {
        const existing = aggregate.usersMap.get(user.user_id);
        if (existing) {
          existing.count++;
        } else {
          aggregate.usersMap.set(user.user_id, {
            userId: user.user_id,
            name: user.name || 'Usuário',
            count: 1,
          });
        }
      });

      if (task.due_date) {
        const dueDate = parseISO(task.due_date);
        if (!aggregate.nearestDueDate || dueDate < aggregate.nearestDueDate) {
          aggregate.nearestDueDate = dueDate;
        }
      }
    });

    const todayStart = startOfDay(today);
    planMap.forEach((plan, clientId) => {
      plan.readinessPercentage = plan.weekTotal > 0 
        ? Math.round((plan.readyCount / plan.weekTotal) * 100) 
        : 0;

      const aggregate = clientAggregates.get(clientId);
      if (aggregate) {
        plan.platforms = Array.from(aggregate.platforms);
        plan.contentTypes = Array.from(aggregate.contentTypes);
        plan.assignedUsers = Array.from(aggregate.usersMap.values()).sort((a, b) => b.count - a.count);
        plan.nearestDueDate = aggregate.nearestDueDate;
        plan.hasUrgentDeadline = aggregate.nearestDueDate !== null && differenceInDays(aggregate.nearestDueDate, todayStart) <= 2;
      }
    });

    return Array.from(planMap.values());
  }, [allTasks, clients, currentWeekStart]);

  const filteredPlans = useMemo(() => {
    return clientPlans
      .filter(plan => {
        if (searchQuery && !plan.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        switch (readinessFilter) {
          case 'ready': return plan.readinessPercentage === 100;
          case 'in_progress': return plan.readinessPercentage > 0 && plan.readinessPercentage < 100;
          case 'pending': return plan.weekTotal === 0;
          case 'overdue': return plan.hasOverdue;
          default: return true;
        }
      })
      .sort((a, b) => {
        if (a.weekTotal > 0 && b.weekTotal === 0) return -1;
        if (a.weekTotal === 0 && b.weekTotal > 0) return 1;
        if (a.weekTotal !== b.weekTotal) return b.weekTotal - a.weekTotal;
        return a.clientName.localeCompare(b.clientName);
      });
  }, [clientPlans, searchQuery, readinessFilter]);

  const handlePrevWeek = () => setCurrentWeekStart(prev => addWeeks(prev, -1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleClientClick = (plan: ClientWeekPlan) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  const handleDayClick = (plan: ClientWeekPlan, _date: Date) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  const handleCreatePost = (_clientId: string) => {
    setDetailsOpen(false);
    navigate('/dashboard/tasks?newTask=redes_sociais');
  };

  const handleViewPost = (task: SocialMediaTask) => {
    setSelectedTask(task);
    setDetailsOpen(false);
  };

  const isLoading = postsLoading || clientsLoading;

  const weekLabel = `${format(currentWeekStart, "d 'de' MMMM", { locale: ptBR })} a ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;

  return (
    <div className="space-y-4">
      <PlanningMetrics clientPlans={clientPlans} totalClients={clients.length} />

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleToday}>Hoje</Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium ml-2 hidden md:inline">Semana de {weekLabel}</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-full sm:w-[200px]" />
          </div>
          <Select value={readinessFilter} onValueChange={(v) => setReadinessFilter(v as ReadinessFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ready">Prontos</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="pending">Sem Posts</SelectItem>
              <SelectItem value="overdue">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm font-medium text-center md:hidden text-muted-foreground">Semana de {weekLabel}</p>

      <div className="border rounded-lg bg-card">
        <div className="grid gap-2 py-2 px-3 border-b bg-muted/50 font-medium text-xs text-muted-foreground sticky top-0" style={{ gridTemplateColumns: "minmax(140px, 1fr) repeat(7, 40px) 50px" }}>
          <div>CLIENTE</div>
          {weekDays.map(day => (
            <div key={day.toISOString()} className="text-center">{format(day, 'EEE', { locale: ptBR }).toUpperCase().slice(0, 3)}</div>
          ))}
          <div className="text-center">TOTAL</div>
        </div>

        <ScrollArea className="h-[calc(100vh-420px)] min-h-[300px]">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-14 w-full" />))}
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>Nenhum cliente encontrado</p>
              {searchQuery && <Button variant="link" onClick={() => setSearchQuery("")}>Limpar busca</Button>}
            </div>
          ) : (
            filteredPlans.map(plan => (
              <ClientWeekRow key={plan.clientId} plan={plan} weekDays={weekDays} onClientClick={() => handleClientClick(plan)} onDayClick={(date) => handleDayClick(plan, date)} />
            ))
          )}
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        <div className="px-3 py-2 border-t bg-muted/30 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-green-500" /><span>Pronto</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-500" /><span>Parcial</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /><span>Em Andamento</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-muted-foreground" /><span>Rascunho</span></div>
        </div>
      </div>

      <ClientPlanningDetails
        plan={selectedPlan}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onCreatePost={handleCreatePost}
        onViewPost={handleViewPost}
        weekDays={weekDays}
      />

      {selectedTask && (
        <TaskDetailsDialog
          task={selectedTask as any}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onEdit={() => navigate('/dashboard/tasks')}
          onDelete={() => {}}
          getClientName={() => selectedTask?.client_name || ''}
          getAssignedUsers={() => selectedTask?.assigned_users || []}
        />
      )}
    </div>
  );
}
