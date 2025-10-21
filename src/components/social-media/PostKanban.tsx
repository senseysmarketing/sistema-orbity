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

export function PostKanban() {
  const { posts, updatePost, deletePost, fetchPosts } = useSocialMediaPosts();
  const { currentAgency } = useAgency();
  const [activePost, setActivePost] = useState<SocialMediaPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialMediaPost | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterContentType, setFilterContentType] = useState<string>("all");

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

    return filtered;
  }, [posts, filterClient, filterContentType]);

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
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
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
          </div>

          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Postagem
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-4">
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
      />
    </div>
  );
}
