import { Badge } from "@/components/ui/badge";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Image, Film, LayoutGrid, Zap, Clock, AlertCircle } from "lucide-react";
import { format, isToday, isBefore, startOfDay, addDays, isBefore as isBeforeDate } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostCardProps {
  post: SocialMediaPost;
  compact?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
}

const platformIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
};

const contentTypeIcons = {
  feed: Image,
  stories: Zap,
  reels: Film,
  carrossel: LayoutGrid,
};

const statusConfig = {
  draft: { label: "Briefing", color: "bg-gray-500" },
  in_creation: { label: "Em Criação", color: "bg-blue-500" },
  pending_approval: { label: "Aguardando", color: "bg-yellow-500" },
  approved: { label: "Aprovado", color: "bg-green-500" },
  published: { label: "Publicado", color: "bg-purple-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500" },
};

// Gera uma cor consistente baseada no client_id
const getClientColor = (clientId?: string | null): string => {
  if (!clientId) return "hsl(var(--muted))";
  
  const colors = [
    "hsl(220, 70%, 50%)", // Azul
    "hsl(340, 75%, 50%)", // Rosa
    "hsl(160, 60%, 45%)", // Verde
    "hsl(280, 65%, 55%)", // Roxo
    "hsl(30, 80%, 55%)",  // Laranja
    "hsl(190, 70%, 50%)", // Ciano
    "hsl(45, 90%, 55%)",  // Amarelo
    "hsl(300, 65%, 50%)", // Magenta
    "hsl(120, 60%, 45%)", // Verde claro
    "hsl(10, 75%, 55%)",  // Vermelho
  ];
  
  // Gera um índice consistente baseado no clientId
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = clientId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const getUrgencyBadge = (scheduledDate: string) => {
  const now = startOfDay(new Date());
  const postDate = startOfDay(new Date(scheduledDate));
  
  if (isBefore(postDate, now)) {
    return { label: "Atrasado", color: "bg-red-500", icon: AlertCircle };
  }
  
  if (isToday(new Date(scheduledDate))) {
    return { label: "Hoje", color: "bg-orange-500", icon: Clock };
  }
  
  const weekFromNow = addDays(now, 7);
  if (isBefore(postDate, weekFromNow)) {
    return { label: "Esta semana", color: "bg-blue-500", icon: Clock };
  }
  
  return null;
};

export function PostCard({ post, compact = false, onClick }: PostCardProps) {
  const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons] || Instagram;
  const ContentTypeIcon = contentTypeIcons[post.post_type as keyof typeof contentTypeIcons] || Image;
  const clientColor = getClientColor(post.client_id);
  const statusInfo = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
  const urgencyBadge = getUrgencyBadge(post.scheduled_date);

  if (compact) {
    return (
      <div 
        className="text-xs p-1.5 rounded border cursor-pointer hover:brightness-95 transition-all"
        onClick={(e) => onClick?.(e)}
        style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
      >
        <div className="flex items-center gap-1">
          <ContentTypeIcon className="h-3 w-3" />
          <span className="truncate flex-1">{post.title}</span>
          <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
        </div>
      </div>
    );
  }

  const UrgencyIcon = urgencyBadge?.icon;

  return (
    <div 
      className="p-4 rounded-lg border cursor-pointer hover:shadow-md hover:brightness-95 transition-all"
      onClick={(e) => onClick?.(e)}
      style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-hidden">
          <ContentTypeIcon className="h-5 w-5 flex-shrink-0" />
          <h3 className="font-semibold line-clamp-2">{post.title}</h3>
        </div>
        <div className="flex gap-1 flex-wrap flex-shrink-0 ml-2">
          <Badge variant="outline" className={`${statusInfo.color} text-white text-xs`}>
            {statusInfo.label}
          </Badge>
          {urgencyBadge && UrgencyIcon && post.status !== 'published' && (
            <Badge variant="outline" className={`${urgencyBadge.color} text-white text-xs flex items-center gap-1`}>
              <UrgencyIcon className="h-3 w-3" />
              {urgencyBadge.label}
            </Badge>
          )}
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
          <span 
            className="font-medium px-2 py-0.5 rounded"
            style={{ backgroundColor: clientColor, color: 'white' }}
          >
            {post.clients.name}
          </span>
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
