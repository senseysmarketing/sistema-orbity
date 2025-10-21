import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="flex flex-col h-[calc(100vh-300px)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className={`h-3 w-3 rounded-full ${color}`} />
          {title}
          <span className="text-sm text-muted-foreground">({posts.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2" ref={setNodeRef}>
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
      </CardContent>
    </Card>
  );
}
