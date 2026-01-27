import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { SortablePostCard } from "./SortablePostCard";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { DropZoneIndicator } from "@/components/ui/drop-zone-indicator";

interface PostKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  posts: SocialMediaPost[];
  onPostClick?: (post: SocialMediaPost) => void;
}

export function PostKanbanColumn({ id, title, color, posts, onPostClick }: PostKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-3 md:space-y-4 min-w-[280px] md:min-w-[330px] w-[280px] md:w-[330px] flex-shrink-0">
      <div className="flex items-center gap-2 px-2 md:px-3 py-2 bg-muted rounded-lg">
        <div className={`w-2.5 md:w-3 h-2.5 md:h-3 ${color} rounded-full`}></div>
        <h3 className="font-semibold text-sm md:text-base">{title}</h3>
        <Badge variant="secondary" className="text-xs">{posts.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2 md:space-y-3 min-h-[300px] md:min-h-[400px] max-h-[60vh] md:max-h-[70vh] overflow-y-auto p-3 md:p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
          isOver 
            ? 'bg-primary/10 border-primary/50 shadow-lg scale-[1.02]' 
            : 'bg-muted/20 border-transparent hover:border-muted-foreground/20 hover:bg-muted/30'
        }`}
      >
        <SortableContext items={posts.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {posts.length === 0 ? (
            <DropZoneIndicator 
              isActive={isOver}
              isEmpty={true}
              title={title}
            />
          ) : (
            posts.map(post => (
              <SortablePostCard key={post.id} post={post} onClick={onPostClick} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
