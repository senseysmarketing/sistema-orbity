import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PostCard } from "./PostCard";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";

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

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PostCard post={post} onClick={() => onClick?.(post)} />
    </div>
  );
}
