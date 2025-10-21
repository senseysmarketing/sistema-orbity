import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PostCard } from "./PostCard";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { GripVertical } from "lucide-react";

interface SortablePostCardProps {
  post: SocialMediaPost;
  onClick?: (post: SocialMediaPost) => void;
}

export function SortablePostCard({ post, onClick }: SortablePostCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Só chama onClick se não estiver arrastando
    if (!isDragging) {
      onClick?.(post);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative"
    >
      <button
        type="button"
        aria-label="Arrastar"
        className="absolute left-2 top-2 z-10 rounded p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <PostCard post={post} onClick={handleClick} />
    </div>
  );
}
