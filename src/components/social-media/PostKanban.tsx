import { useState, useMemo, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { PostKanbanColumn } from "./PostKanbanColumn";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { PostFormDialog } from "./PostFormDialog";
import { PostDetailsDialog } from "./PostDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { PostCardSkeleton } from "@/components/ui/post-card-skeleton";
import { DateRange } from "react-day-picker";
import { DateRangeFilterDialog } from "@/components/filters/DateRangeFilterDialog";

export function PostKanban() {
  const { posts, loading, updatePost, deletePost, fetchPosts } = useSocialMediaPosts();
  const { currentAgency } = useAgency();
  const [activePost, setActivePost] = useState<SocialMediaPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [includeNoDate, setIncludeNoDate] = useState(false);

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

  // Buscar status customizados
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['custom-statuses', currentAgency?.id],
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

  // Combinar colunas padrão com status customizados
  const allColumns = useMemo(() => {
    const defaultCols = [
      { id: "draft", title: "Briefing", color: "bg-gray-500" },
      { id: "in_creation", title: "Em Criação", color: "bg-blue-500" },
      { id: "pending_approval", title: "Aguardando Aprovação", color: "bg-yellow-500" },
      { id: "approved", title: "Aprovado", color: "bg-green-500" },
      { id: "published", title: "Publicado", color: "bg-purple-500" },
    ];
    
    const customCols = customStatuses.map(status => ({
      id: status.slug,
      title: status.name,
      color: status.color,
    }));
    
    return [...defaultCols, ...customCols];
  }, [customStatuses]);

  // Obter lista de clientes únicos
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map();
    posts.forEach(post => {
      if (post.client_id && post.clients) {
        clientsMap.set(post.client_id, post.clients.name);
      }
    });
    return Array.from(clientsMap, ([id, name]) => ({ id, name }));
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

    if (filterClient !== "all") {
      filtered = filtered.filter(post => post.client_id === filterClient);
    }

    if (filterContentType !== "all") {
      filtered = filtered.filter(post => post.post_type === filterContentType);
    }

    // Filtro por período (scheduled_date)
    const from = dateRange?.from ? toStartOfDay(dateRange.from) : undefined;
    const to = dateRange?.to ? toEndOfDay(dateRange.to) : undefined;
    if (from) {
      filtered = filtered.filter((post) => {
        const scheduled = (post as any).scheduled_date as string | null | undefined;
        if (!scheduled) return includeNoDate;
        const d = new Date(scheduled);
        if (isNaN(d.getTime())) return includeNoDate;

        if (to) return d >= from && d <= to;
        return d >= from;
      });
    }

    return filtered;
  }, [posts, filterClient, filterContentType, dateRange, includeNoDate]);

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find(p => p.id === event.active.id);
    setActivePost(post || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const postId = active.id as string;
      const newStatus = over.id as string;
      const post = posts.find(p => p.id === postId);
      
      if (post) {
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
    }

    setActivePost(null);
  };

  const getPostsByStatus = (status: string) => {
    return filteredPosts
      .filter(post => post.status === status)
      .sort((a, b) => {
        const aTime = a?.scheduled_date ? new Date(a.scheduled_date).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b?.scheduled_date ? new Date(b.scheduled_date).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
  };

  const hasActiveFilters =
    filterClient !== "all" ||
    filterContentType !== "all" ||
    !!dateRange?.from ||
    includeNoDate !== false;

  const clearFilters = () => {
    setFilterClient("all");
    setFilterContentType("all");
    setDateRange(undefined);
    setIncludeNoDate(false);
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
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
        <h2 className="text-2xl font-bold">Kanban de Produção</h2>
        
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os clientes" />
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos os tipos" />
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

            <DateRangeFilterDialog
              value={dateRange}
              onChange={setDateRange}
              includeNoDate={includeNoDate}
              onIncludeNoDateChange={setIncludeNoDate}
              defaultIncludeNoDate={false}
              label="Período"
              active={!!dateRange?.from || includeNoDate}
            />

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Postagem
          </Button>
        </div>
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
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
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
