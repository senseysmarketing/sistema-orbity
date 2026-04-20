import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Filter, X, Grid3x3, CalendarDays, List } from "lucide-react";
import { useSocialMediaTasks, SocialMediaTask } from "@/hooks/useSocialMediaTasks";
import { TaskDetailsDialog } from "@/components/tasks/TaskDetailsDialog";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getVirtualAgencyClient, isVirtualAgencyClient } from "@/lib/virtualAgencyClient";

const STATUSES = [
  { value: "draft", label: "Briefing" },
  { value: "in_creation", label: "Em Criação" },
  { value: "pending_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "published", label: "Publicado" },
];

const getClientColor = (clientId?: string | null): string => {
  if (!clientId) return "hsl(var(--muted))";
  const colors = [
    "hsl(220, 70%, 50%)", "hsl(340, 75%, 50%)", "hsl(160, 60%, 45%)",
    "hsl(280, 65%, 55%)", "hsl(30, 80%, 55%)", "hsl(190, 70%, 50%)",
    "hsl(45, 90%, 55%)", "hsl(300, 65%, 50%)", "hsl(120, 60%, 45%)",
    "hsl(10, 75%, 55%)",
  ];
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};


export function SocialMediaCalendar() {
  const { currentAgency } = useAgency();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [selectedTask, setSelectedTask] = useState<SocialMediaTask | null>(null);
  
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { allTasks } = useSocialMediaTasks();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-filter", currentAgency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency?.id)
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(selectedDate, { locale: ptBR });
  const weekEnd = endOfWeek(selectedDate, { locale: ptBR });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hasActiveFilters = clientFilter.length > 0 || statusFilter !== "all";
  const clearFilters = () => { setClientFilter([]); setStatusFilter("all"); };
  const toggleClientFilter = (clientId: string) => {
    setClientFilter(prev => prev.includes(clientId) ? prev.filter(id => id !== clientId) : [...prev, clientId]);
  };

  const clientsWithAgency = currentAgency
    ? [getVirtualAgencyClient({ id: currentAgency.id, name: currentAgency.name }), ...clients]
    : clients;

  const getFilteredPostsForDate = (date: Date) => {
    return allTasks.filter(task => {
      const effectiveDate = task.post_date || task.scheduled_date;
      if (!effectiveDate) return false;
      const matchesDate = isSameDay(new Date(effectiveDate), date);
      if (!matchesDate) return false;

      const hasAgencyFilter = clientFilter.some(isVirtualAgencyClient);
      const realClientFilter = clientFilter.filter(id => !isVirtualAgencyClient(id));

      const matchesClient =
        clientFilter.length === 0 ||
        (hasAgencyFilter && task.is_internal) ||
        (!!task.client_id && realClientFilter.includes(task.client_id));

      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesClient && matchesStatus;
    });
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const handleTaskClick = (task: SocialMediaTask) => {
    setSelectedTask(task as any);
  };

  const handleCreateNew = () => {
    navigate('/dashboard/tasks?newTask=redes_sociais');
  };

  const weekDaysMobile = ["D", "S", "T", "Q", "Q", "S", "S"];
  const weekDaysDesktop = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const CompactTaskCard = ({ task, onClick }: { task: SocialMediaTask; onClick?: (e?: React.MouseEvent) => void }) => {
    const displayClientName = task.is_internal
      ? `${currentAgency?.name ?? 'Agência'} (Interno)`
      : task.client_name;
    return (
      <div
        className="p-1.5 rounded border bg-card hover:bg-muted/50 cursor-pointer transition-colors text-left"
        onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      >
        <p className="text-xs font-medium truncate">{task.title || 'Sem título'}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {task.platform && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{task.platform}</Badge>}
          {displayClientName && <span className="text-[9px] text-muted-foreground truncate">{displayClientName}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-base sm:text-xl font-semibold capitalize whitespace-nowrap">
              {format(selectedDate, "MMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant={viewMode === "month" ? "default" : "outline"} size="icon" onClick={() => setViewMode("month")} className="h-9 w-9" title="Mês">
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "week" ? "default" : "outline"} size="icon" onClick={() => setViewMode("week")} className="h-9 w-9" title="Semana">
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "day" ? "default" : "outline"} size="icon" onClick={() => setViewMode("day")} className="h-9 w-9" title="Dia">
              <List className="h-4 w-4" />
            </Button>
            
            <Button onClick={handleCreateNew} className="h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Nova Postagem</span>
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                {clientFilter.length === 0 ? "Clientes" : `${clientFilter.length} cliente(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {clientsWithAgency.map((client) => (
                    <div key={client.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer" onClick={() => toggleClientFilter(client.id)}>
                      <Checkbox checked={clientFilter.includes(client.id)} onCheckedChange={() => toggleClientFilter(client.id)} />
                      <span className="text-sm">{client.name}</span>
                    </div>
                  ))}
                  {clients.length === 0 && <p className="text-sm text-muted-foreground p-2">Nenhum cliente encontrado</p>}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] sm:w-[150px] h-8 text-xs sm:text-sm flex-shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {viewMode === "month" && (
        <div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {weekDaysMobile.map((day, i) => (
              <div key={i} className="text-center font-semibold text-xs sm:text-sm p-1 sm:p-2">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{weekDaysDesktop[i]}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(day => {
              const dayPosts = getFilteredPostsForDate(day);
              const isCurrentDay = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, selectedDate);
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div className={cn(
                      "min-h-[50px] sm:min-h-[100px] p-1 sm:p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors bg-card",
                      isCurrentDay && "border-primary border-2",
                      !isCurrentMonth && "opacity-50 bg-muted/30"
                    )}>
                      <div className="text-xs sm:text-sm font-medium mb-1">{format(day, "d")}</div>
                      
                      {/* Mobile: color dots */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayPosts.slice(0, 4).map(task => (
                          <div key={task.id} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getClientColor(task.client_id) }} title={task.title} />
                        ))}
                        {dayPosts.length > 4 && <span className="text-[9px] text-muted-foreground font-medium">+{dayPosts.length - 4}</span>}
                      </div>
                      
                      {/* Desktop: compact cards */}
                      <div className="hidden sm:block space-y-1">
                        {dayPosts.slice(0, 2).map(task => (
                          <CompactTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                        ))}
                        {dayPosts.length > 2 && <span className="text-xs text-muted-foreground">+{dayPosts.length - 2} mais</span>}
                      </div>
                    </div>
                  </PopoverTrigger>
                  
                  {dayPosts.length > 0 && (
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-3 border-b bg-popover">
                        <p className="text-sm font-medium">{format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})</p>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="p-2 space-y-2 bg-popover">
                          {dayPosts.map(task => (
                            <CompactTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDaysMobile.map((day, i) => (
              <div key={i} className="text-center font-semibold text-xs sm:text-sm p-1 sm:p-2">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{weekDaysDesktop[i]}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map(day => {
              const dayPosts = getFilteredPostsForDate(day);
              const isCurrentDay = isSameDay(day, new Date());
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div className={cn(
                      "min-h-[80px] sm:min-h-[200px] p-1 sm:p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors bg-card",
                      isCurrentDay && "border-primary border-2"
                    )}>
                      <div className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">{format(day, "d")}</div>
                      
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayPosts.slice(0, 6).map(task => (
                          <div key={task.id} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getClientColor(task.client_id) }} title={task.title} />
                        ))}
                        {dayPosts.length > 6 && <span className="text-[9px] text-muted-foreground font-medium">+{dayPosts.length - 6}</span>}
                      </div>
                      
                      <div className="hidden sm:block space-y-2">
                        {dayPosts.slice(0, 4).map(task => (
                          <CompactTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                        ))}
                        {dayPosts.length > 4 && <span className="text-xs text-muted-foreground">+{dayPosts.length - 4} mais</span>}
                        {dayPosts.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma postagem</p>}
                      </div>
                    </div>
                  </PopoverTrigger>
                  
                  {dayPosts.length > 0 && (
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-3 border-b bg-popover">
                        <p className="text-sm font-medium">{format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})</p>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="p-2 space-y-2 bg-popover">
                          {dayPosts.map(task => (
                            <CompactTaskCard key={task.id} task={task} onClick={() => handleTaskClick(task)} />
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  )}
                </Popover>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "day" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-2xl capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {getFilteredPostsForDate(selectedDate).length > 0 ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {getFilteredPostsForDate(selectedDate).map(task => (
                    <div
                      key={task.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <p className="font-medium text-sm">{task.title || 'Sem título'}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {task.platform && <Badge variant="outline" className="text-xs">{task.platform}</Badge>}
                        {(task.is_internal ? `${currentAgency?.name ?? 'Agência'} (Interno)` : task.client_name) && (
                          <span className="text-xs text-muted-foreground">{task.is_internal ? `${currentAgency?.name ?? 'Agência'} (Interno)` : task.client_name}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-base sm:text-lg">
                    {hasActiveFilters ? "Nenhuma postagem encontrada com os filtros aplicados" : "Nenhuma postagem agendada para este dia"}
                  </p>
                  <Button className="mt-4" onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Postagem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Task Details Dialog */}
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
