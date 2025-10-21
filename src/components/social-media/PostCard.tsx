import { Badge } from "@/components/ui/badge";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { Instagram, Facebook, Linkedin, Twitter, Youtube } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostCardProps {
  post: SocialMediaPost;
  compact?: boolean;
  onClick?: () => void;
}

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

const statusColors = {
  draft: "bg-gray-500",
  pending_approval: "bg-yellow-500",
  approved: "bg-green-500",
  published: "bg-blue-500",
  rejected: "bg-red-500",
};

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

export function PostCard({ post, compact = false, onClick }: PostCardProps) {
  const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons] || Instagram;

  if (compact) {
    return (
      <div 
        className="text-xs p-1 rounded border cursor-pointer hover:bg-accent transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-1">
          <PlatformIcon className="h-3 w-3" />
          <span className="truncate flex-1">{post.title}</span>
          <div className={`h-2 w-2 rounded-full ${statusColors[post.status as keyof typeof statusColors]}`} />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 rounded-lg border bg-card cursor-pointer hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <PlatformIcon className="h-5 w-5" />
          <h3 className="font-semibold">{post.title}</h3>
        </div>
        <div className="flex gap-1">
          <Badge variant="outline" className={`${statusColors[post.status as keyof typeof statusColors]} text-white`}>
            {post.status}
          </Badge>
          <Badge variant="outline" className={`${priorityColors[post.priority as keyof typeof priorityColors]} text-white`}>
            {post.priority}
          </Badge>
        </div>
      </div>
      
      {post.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {post.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {format(new Date(post.scheduled_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
        {post.clients && (
          <span className="font-medium">{post.clients.name}</span>
        )}
      </div>

      {post.hashtags && post.hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {post.hashtags.slice(0, 3).map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {post.hashtags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{post.hashtags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
