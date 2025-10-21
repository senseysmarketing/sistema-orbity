import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { PostKanbanColumn } from "./PostKanbanColumn";
import { PostCard } from "./PostCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostFormDialog } from "./PostFormDialog";

const defaultColumns = [
  { id: "draft", title: "Briefing", color: "bg-gray-500" },
  { id: "in_creation", title: "Em Criação", color: "bg-blue-500" },
  { id: "pending_approval", title: "Aguardando Aprovação", color: "bg-yellow-500" },
  { id: "approved", title: "Aprovado", color: "bg-green-500" },
  { id: "published", title: "Publicado", color: "bg-purple-500" },
];

export function PostKanban() {
  const { posts, updatePost } = useSocialMediaPosts();
  const [activePost, setActivePost] = useState<SocialMediaPost | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find(p => p.id === event.active.id);
    setActivePost(post || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const postId = active.id as string;
      const newStatus = over.id as string;
      
      await updatePost(postId, { status: newStatus });
    }

    setActivePost(null);
  };

  const getPostsByStatus = (status: string) => {
    return posts.filter(post => post.status === status);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Kanban de Produção</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Postagem
        </Button>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {defaultColumns.map(column => (
            <PostKanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              posts={getPostsByStatus(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activePost ? <PostCard post={activePost} /> : null}
        </DragOverlay>
      </DndContext>

      <PostFormDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
