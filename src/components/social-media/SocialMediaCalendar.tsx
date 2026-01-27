import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Filter, X, Grid3x3, CalendarDays, List } from "lucide-react";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { PostFormDialog } from "./PostFormDialog";
import { PostCard } from "./PostCard";
import { PostDetailsDialog } from "./PostDetailsDialog";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "draft", label: "Briefing" },
  { value: "in_creation", label: "Em Criação" },
  { value: "pending_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
];

// Gera uma cor consistente baseada no client_id
const getClientColor = (clientId?: string | null): string => {
  if (!clientId) return "hsl(var(--muted))";
  
  const colors = [
    "hsl(220, 70%, 50%)",
    "hsl(340, 75%, 50%)",
    "hsl(160, 60%, 45%)",
    "hsl(280, 65%, 55%)",
    "hsl(30, 80%, 55%)",
    "hsl(190, 70%, 50%)",
    "hsl(45, 90%, 55%)",
    "hsl(300, 65%, 50%)",
    "hsl(120, 60%, 45%)",
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  
  // Estados de filtro
  const [clientFilter, setClientFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { allPosts, loading, deletePost, fetchPosts } = useSocialMediaPosts();

  // Buscar clientes para o filtro
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

  // Verificar se há filtros ativos
  const hasActiveFilters = clientFilter.length > 0 || statusFilter !== "all";

  // Limpar todos os filtros
  const clearFilters = () => {
    setClientFilter([]);
    setStatusFilter("all");
  };

  // Toggle cliente no filtro
  const toggleClientFilter = (clientId: string) => {
    setClientFilter(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Filtrar posts por data e filtros ativos
  const getFilteredPostsForDate = (date: Date) => {
    return allPosts.filter(post => {
      const effectiveDate = post.post_date || post.scheduled_date;
      const matchesDate = isSameDay(new Date(effectiveDate), date);
      if (!matchesDate) return false;
      
      const matchesClient = clientFilter.length === 0 || 
        clientFilter.includes(post.client_id || '');
      
      const matchesStatus = statusFilter === "all" || 
        post.status === statusFilter;
      
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

  const handlePostClick = (post: SocialMediaPost) => {
    setSelectedPost(post);
    setIsDetailsOpen(true);
  };

  const handleEdit = (post: SocialMediaPost) => {
    setEditingPost(post);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
  };

  const handleDuplicate = (post: SocialMediaPost) => {
    const duplicatedPost = {
      ...post,
      id: '',
      title: `${post.title} (Cópia)`,
      status: 'draft',
      created_at: '',
      created_by: '',
      approval_history: [],
    };
    setEditingPost(duplicatedPost as SocialMediaPost);
    setIsDetailsOpen(false);
    setIsCreateDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsCreateDialogOpen(false);
    setEditingPost(null);
  };

  const weekDaysMobile = ["D", "S", "T", "Q", "Q", "S", "S"];
  const weekDaysDesktop = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header responsivo */}
      <div className="space-y-3">
        {/* Linha 1: Navegação + View Mode + Nova Postagem */}
        <div className="flex items-center justify-between gap-2">
          {/* Navegação de mês */}
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
          
          {/* View mode + Nova Postagem */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("month")}
              className="h-9 w-9"
              title="Mês"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("week")}
              className="h-9 w-9"
              title="Semana"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("day")}
              className="h-9 w-9"
              title="Dia"
            >
              <List className="h-4 w-4" />
            </Button>
            
            <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Nova Postagem</span>
            </Button>
          </div>
        </div>
        
        {/* Linha 2: Filtros compactos */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          
          {/* Filtro de Cliente */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
                {clientFilter.length === 0 
                  ? "Clientes" 
                  : `${clientFilter.length} cliente(s)`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-1">
                  {clients.map((client) => (
                    <div 
                      key={client.id} 
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleClientFilter(client.id)}
                    >
                      <Checkbox 
                        checked={clientFilter.includes(client.id)}
                        onCheckedChange={() => toggleClientFilter(client.id)}
                      />
                      <span className="text-sm">{client.name}</span>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <p className="text-sm text-muted-foreground p-2">Nenhum cliente encontrado</p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] sm:w-[150px] h-8 text-xs sm:text-sm flex-shrink-0">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUSES.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {viewMode === "month" && (
        <div>
          {/* Header dos dias - responsivo */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {weekDaysMobile.map((day, i) => (
              <div key={i} className="text-center font-semibold text-xs sm:text-sm p-1 sm:p-2">
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{weekDaysDesktop[i]}</span>
              </div>
            ))}
          </div>
          
          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(day => {
              const dayPosts = getFilteredPostsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, selectedDate);
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div 
                      className={cn(
                        "min-h-[50px] sm:min-h-[100px] p-1 sm:p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors bg-card",
                        isToday && "border-primary border-2",
                        !isCurrentMonth && "opacity-50 bg-muted/30"
                      )}
                    >
                      {/* Número do dia */}
                      <div className="text-xs sm:text-sm font-medium mb-1">
                        {format(day, "d")}
                      </div>
                      
                      {/* Mobile: indicadores de cor */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayPosts.slice(0, 4).map(post => (
                          <div 
                            key={post.id}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getClientColor(post.client_id) }}
                            title={post.title}
                          />
                        ))}
                        {dayPosts.length > 4 && (
                          <span className="text-[9px] text-muted-foreground font-medium">+{dayPosts.length - 4}</span>
                        )}
                      </div>
                      
                      {/* Desktop: cards de post */}
                      <div className="hidden sm:block space-y-1">
                        {dayPosts.slice(0, 2).map(post => (
                          <PostCard 
                            key={post.id} 
                            post={post} 
                            compact 
                            showArchived
                            onClick={(e) => {
                              e?.stopPropagation();
                              handlePostClick(post);
                            }}
                          />
                        ))}
                        {dayPosts.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayPosts.length - 2} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </PopoverTrigger>
                  
                  {/* Popover com lista de posts ao clicar */}
                  {dayPosts.length > 0 && (
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-3 border-b bg-popover">
                        <p className="text-sm font-medium">
                          {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})
                        </p>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="p-2 space-y-2 bg-popover">
                          {dayPosts.map(post => (
                            <PostCard 
                              key={post.id} 
                              post={post} 
                              compact 
                              showArchived
                              onClick={() => handlePostClick(post)}
                            />
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
          {/* Header dos dias - responsivo */}
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
              const isToday = isSameDay(day, new Date());
              
              return (
                <Popover key={day.toISOString()}>
                  <PopoverTrigger asChild>
                    <div 
                      className={cn(
                        "min-h-[80px] sm:min-h-[200px] p-1 sm:p-3 rounded border cursor-pointer hover:bg-muted/50 transition-colors bg-card",
                        isToday && "border-primary border-2"
                      )}
                    >
                      <div className="text-sm sm:text-lg font-medium mb-1 sm:mb-2">
                        {format(day, "d")}
                      </div>
                      
                      {/* Mobile: indicadores de cor */}
                      <div className="flex flex-wrap gap-0.5 sm:hidden">
                        {dayPosts.slice(0, 6).map(post => (
                          <div 
                            key={post.id}
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getClientColor(post.client_id) }}
                            title={post.title}
                          />
                        ))}
                        {dayPosts.length > 6 && (
                          <span className="text-[9px] text-muted-foreground font-medium">+{dayPosts.length - 6}</span>
                        )}
                      </div>
                      
                      {/* Desktop: cards de post */}
                      <div className="hidden sm:block space-y-2">
                        {dayPosts.slice(0, 4).map(post => (
                          <PostCard 
                            key={post.id} 
                            post={post} 
                            compact 
                            showArchived
                            onClick={(e) => {
                              e?.stopPropagation();
                              handlePostClick(post);
                            }}
                          />
                        ))}
                        {dayPosts.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{dayPosts.length - 4} mais
                          </span>
                        )}
                        {dayPosts.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Nenhuma postagem
                          </p>
                        )}
                      </div>
                    </div>
                  </PopoverTrigger>
                  
                  {/* Popover com lista de posts ao clicar */}
                  {dayPosts.length > 0 && (
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-3 border-b bg-popover">
                        <p className="text-sm font-medium">
                          {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})
                        </p>
                      </div>
                      <ScrollArea className="max-h-60">
                        <div className="p-2 space-y-2 bg-popover">
                          {dayPosts.map(post => (
                            <PostCard 
                              key={post.id} 
                              post={post} 
                              compact 
                              showArchived
                              onClick={() => handlePostClick(post)}
                            />
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
                  {getFilteredPostsForDate(selectedDate).map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      showArchived
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-muted-foreground text-base sm:text-lg">
                    {hasActiveFilters 
                      ? "Nenhuma postagem encontrada com os filtros aplicados"
                      : "Nenhuma postagem agendada para este dia"}
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Postagem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <PostFormDialog 
        open={isCreateDialogOpen}
        onOpenChange={handleDialogClose}
        defaultDate={selectedDate}
        editPost={editingPost}
      />

      <PostDetailsDialog
        post={selectedPost}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
}
