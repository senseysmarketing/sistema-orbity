import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
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

const STATUSES = [
  { value: "draft", label: "Briefing" },
  { value: "in_creation", label: "Em Criação" },
  { value: "pending_approval", label: "Aguardando Aprovação" },
  { value: "approved", label: "Aprovado" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
];

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
  // IMPORTANTE: Usar post_date para o calendário (ou scheduled_date como fallback)
  const getFilteredPostsForDate = (date: Date) => {
    return allPosts.filter(post => {
      // Filtro por data - usar post_date prioritariamente
      const effectiveDate = post.post_date || post.scheduled_date;
      const matchesDate = isSameDay(new Date(effectiveDate), date);
      if (!matchesDate) return false;
      
      // Filtro por cliente
      const matchesClient = clientFilter.length === 0 || 
        clientFilter.includes(post.client_id || '');
      
      // Filtro por status
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Navegação de mês */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold capitalize">
            {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Filtros + Botões de visualização + Nova Postagem */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtros */}
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Filtro de Cliente - Multi-select com Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                {clientFilter.length === 0 
                  ? "Todos os clientes" 
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
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
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
              onClick={clearFilters}
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          
          {/* Separador visual */}
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
          
          {/* Botões de visualização */}
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            onClick={() => setViewMode("month")}
          >
            Mês
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            onClick={() => setViewMode("week")}
          >
            Semana
          </Button>
          <Button
            variant={viewMode === "day" ? "default" : "outline"}
            onClick={() => setViewMode("day")}
          >
            Dia
          </Button>
          
          {/* Botão Nova Postagem */}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Postagem
          </Button>
        </div>
      </div>

      {viewMode === "month" && (
        <div className="grid grid-cols-7 gap-2">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}
          
          {calendarDays.map(day => {
            const dayPosts = getFilteredPostsForDate(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, selectedDate);
            
            return (
              <Card 
                key={day.toISOString()} 
                className={`min-h-[120px] ${isToday ? 'border-primary' : ''} ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <CardHeader className="p-2">
                  <CardTitle className="text-sm">{format(day, "d")}</CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {dayPosts.slice(0, 3).map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      compact 
                      showArchived
                      onClick={() => handlePostClick(post)}
                    />
                  ))}
                  {dayPosts.length > 3 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="text-xs text-muted-foreground p-0 h-auto hover:text-primary w-full justify-start"
                        >
                          +{dayPosts.length - 3} mais
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <div className="p-3 border-b">
                          <p className="text-sm font-medium">
                            Postagens em {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})
                          </p>
                        </div>
                        <ScrollArea className="max-h-80">
                          <div className="p-2 space-y-2">
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
                    </Popover>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {viewMode === "week" && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
              <div key={day} className="text-center font-semibold text-sm p-2">
                {day}
              </div>
            ))}
            
            {weekDays.map(day => {
              const dayPosts = getFilteredPostsForDate(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Card 
                  key={day.toISOString()} 
                  className={`min-h-[200px] ${isToday ? 'border-primary border-2' : ''}`}
                >
                  <CardHeader className="p-3">
                    <CardTitle className="text-lg">{format(day, "d")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {dayPosts.slice(0, 5).map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        compact 
                        showArchived
                        onClick={() => handlePostClick(post)}
                      />
                    ))}
                    {dayPosts.length > 5 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-xs text-muted-foreground p-0 h-auto hover:text-primary w-full justify-start"
                          >
                            +{dayPosts.length - 5} mais
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="start">
                          <div className="p-3 border-b">
                            <p className="text-sm font-medium">
                              Postagens em {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})
                            </p>
                          </div>
                          <ScrollArea className="max-h-80">
                            <div className="p-2 space-y-2">
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
                      </Popover>
                    )}
                    {dayPosts.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Nenhuma postagem
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "day" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl capitalize">
                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getFilteredPostsForDate(selectedDate).length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
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
        onPostUpdate={fetchPosts}
      />
    </div>
  );
}
