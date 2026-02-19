import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { PostKanbanColumn } from "./PostKanbanColumn";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown, X, Search } from "lucide-react";
import { PostFormDialog } from "./PostFormDialog";
import { PostDetailsDialog } from "./PostDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { PostCardSkeleton } from "@/components/ui/post-card-skeleton";
import { DateRange } from "react-day-picker";
import { DateRangeFilterDialog } from "@/components/filters/DateRangeFilterDialog";

interface PostKanbanProps {
  isCreateDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function PostKanban({ isCreateDialogOpen, onCreateDialogOpenChange }: PostKanbanProps) {
  const { posts, loading, updatePost, deletePost, fetchPosts } = useSocialMediaPosts();
  const { currentAgency } = useAgency();
  const [activePost, setActivePost] = useState<SocialMediaPost | null>(null);
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [includeNoDate, setIncludeNoDate] = useState(false);
  const [sortBy, setSortBy] = useState<"post_date" | "due_date">("post_date");

  // Usar props externas se disponíveis, senão usar estado interno
  const dialogOpen = isCreateDialogOpen ?? internalDialogOpen;
  const setDialogOpen = onCreateDialogOpenChange ?? setInternalDialogOpen;

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

  // Buscar todos os status ativos da agência (padrão + customizados), ordenados por order_position
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['social-media-statuses-kanban', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_custom_statuses')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('order_position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Colunas derivadas 100% do banco — sem hard-code
  const allColumns = useMemo(() => {
    return customStatuses.map(status => ({
      id: status.slug,
      title: status.name,
      color: status.color,
    }));
  }, [customStatuses]);

  // Buscar clientes ativos em ordem alfabética diretamente do banco
  const { data: uniqueClients = [] } = useQuery({
    queryKey: ['active-clients-filter', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', currentAgency.id)
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Obter lista de usuários únicos atribuídos aos posts
  const uniqueUsers = useMemo(() => {
    const usersMap = new Map();
    posts.forEach(post => {
      (post.assigned_users || []).forEach(user => {
        if (user.user_id && !usersMap.has(user.user_id)) {
          usersMap.set(user.user_id, user.name);
        }
      });
    });
    return Array.from(usersMap, ([id, name]) => ({ id, name }));
  }, [posts]);

  // Tipos de conteúdo padrão
  const defaultContentTypes = [
    { id: 'feed', label: 'Feed' },
    { id: 'stories', label: 'Stories' },
    { id: 'reels', label: 'Reels' },
    { id: 'carrossel', label: 'Carrossel' },
    { id: 'video', label: 'Vídeo' },
  ];

  // Buscar tipos de conteúdo customizados e combinar com padrões
  const { data: customContentTypes = [] } = useQuery({
    queryKey: ['content-types', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_content_types')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .eq('is_default', false);
      if (error) throw error;
      return (data || []).map(ct => ({ id: ct.slug, label: ct.name }));
    },
    enabled: !!currentAgency?.id,
  });

  const allContentTypes = [...defaultContentTypes, ...customContentTypes];

  // Filtrar posts
  const filteredPosts = useMemo(() => {
    let filtered = posts;

    // Filtro de busca por título, descrição ou cliente
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(term) ||
        post.description?.toLowerCase().includes(term) ||
        post.clients?.name?.toLowerCase().includes(term)
      );
    }

    if (filterClient !== "all") {
      filtered = filtered.filter(post => post.client_id === filterClient);
    }

    if (filterContentType !== "all") {
      filtered = filtered.filter(post => post.post_type === filterContentType);
    }

    if (filterUser !== "all") {
      filtered = filtered.filter(post => 
        (post.assigned_users || []).some(user => user.user_id === filterUser)
      );
    }

    // Filtro por período - usar a data selecionada no sortBy
    const from = dateRange?.from ? toStartOfDay(dateRange.from) : undefined;
    const to = dateRange?.to ? toEndOfDay(dateRange.to) : undefined;
    if (from) {
      filtered = filtered.filter((post) => {
        // Usar post_date ou due_date dependendo do sortBy
        const dateField = sortBy === "due_date" ? post.due_date : (post.post_date || post.scheduled_date);
        if (!dateField) return includeNoDate;
        const d = new Date(dateField);
        if (isNaN(d.getTime())) return includeNoDate;

        if (to) return d >= from && d <= to;
        return d >= from;
      });
    }

    return filtered;
  }, [posts, searchTerm, filterClient, filterContentType, filterUser, dateRange, includeNoDate, sortBy]);

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find(p => p.id === event.active.id);
    setActivePost(post || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActivePost(null);
      return;
    }

    const postId = active.id as string;
    let newStatus = over.id as string;

    // Verificar se over.id é um ID de coluna válido
    const isValidColumn = allColumns.some(col => col.id === newStatus);

    if (!isValidColumn) {
      // over.id pode ser o ID de outro post - precisamos descobrir em qual coluna o post foi solto
      const overData = over.data.current;
      
      if (overData?.sortable?.containerId) {
        newStatus = overData.sortable.containerId;
      } else {
        // Fallback: se não conseguir determinar a coluna, não faz nada
        console.warn('Não foi possível determinar a coluna de destino:', over.id);
        setActivePost(null);
        return;
      }
    }

    // Verificar novamente após correção
    if (!allColumns.some(col => col.id === newStatus)) {
      console.warn('Status de destino inválido:', newStatus);
      setActivePost(null);
      return;
    }

    const post = posts.find(p => p.id === postId);
    
    // Só atualiza se o status realmente mudou
    if (post && post.status !== newStatus) {
      // Buscar dados do usuário
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      // Buscar nome do usuário do perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .single();
      
      // Adicionar entrada ao histórico
      const approvalHistory = post.approval_history || [];
      const newEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_name: profileData?.name || 'Usuário desconhecido',
        action: `Status alterado para: ${allColumns.find(c => c.id === newStatus)?.title || newStatus}`
      };
      
      await updatePost(postId, { 
        status: newStatus,
        approval_history: [...approvalHistory, newEntry]
      });
    }

    setActivePost(null);
  };

  const getPostsByStatus = (status: string) => {
    return filteredPosts
      .filter(post => post.status === status)
      .sort((a, b) => {
        // Ordenar pela data selecionada
        const getDate = (post: SocialMediaPost) => {
          if (sortBy === "due_date") {
            return post.due_date ? new Date(post.due_date).getTime() : Number.POSITIVE_INFINITY;
          }
          const postDate = post.post_date || post.scheduled_date;
          return postDate ? new Date(postDate).getTime() : Number.POSITIVE_INFINITY;
        };
        return getDate(a) - getDate(b);
      });
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    filterClient !== "all" ||
    filterContentType !== "all" ||
    filterUser !== "all" ||
    !!dateRange?.from ||
    includeNoDate !== false ||
    sortBy !== "post_date";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterClient("all");
    setFilterContentType("all");
    setFilterUser("all");
    setDateRange(undefined);
    setIncludeNoDate(false);
    setSortBy("post_date");
  };

  const handlePostClick = (post: SocialMediaPost) => {
    setSelectedPost(post);
    setIsDetailsOpen(true);
  };

  const handleEdit = (post: SocialMediaPost) => {
    setEditingPost(post);
    setDialogOpen(true);
  };

  const handleDelete = async (postId: string) => {
    await deletePost(postId);
    toast.success("Postagem excluída com sucesso");
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
    setDialogOpen(true);
  };

  return (
    <div className="space-y-3 md:space-y-4 h-full flex flex-col">
      {/* Linha 1: Campo de Busca */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar posts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      {/* Linha 2: Filtros com scroll horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 flex-shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {uniqueClients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterContentType} onValueChange={setFilterContentType}>
          <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {allContentTypes.map(type => (
              <SelectItem key={type.id} value={type.id}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[110px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {uniqueUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-shrink-0">
          <DateRangeFilterDialog
            value={dateRange}
            onChange={setDateRange}
            includeNoDate={includeNoDate}
            onIncludeNoDateChange={setIncludeNoDate}
            defaultIncludeNoDate={false}
            label="Período"
            active={!!dateRange?.from || includeNoDate}
          />
        </div>

        {/* Seletor de ordenação */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as "post_date" | "due_date")}>
          <SelectTrigger className="w-[120px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <ArrowUpDown className="h-3.5 w-3.5 flex-shrink-0" />
              <SelectValue placeholder="Ordenar" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="post_date">Data Postagem</SelectItem>
            <SelectItem value="due_date">Data Entrega</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex gap-6 overflow-x-auto pb-4 h-full">
            {allColumns.map(column => (
              <div key={column.id} className="flex-shrink-0 w-[350px] space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold">{column.title}</h3>
                </div>
                <div className="space-y-3">
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4 h-full scroll-smooth scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {allColumns.map(column => (
                <PostKanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  posts={getPostsByStatus(column.id)}
                  onPostClick={handlePostClick}
                />
              ))}
            </div>

            <DragOverlay>
              {activePost ? <PostCard post={activePost} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <PostFormDialog 
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
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
