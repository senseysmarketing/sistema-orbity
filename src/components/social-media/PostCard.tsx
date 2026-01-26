import { Badge } from "@/components/ui/badge";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { Instagram, Facebook, Linkedin, Twitter, Youtube, Image, Film, LayoutGrid, Zap, Clock, AlertCircle, Users, Archive, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PostDueDateBadge, getDueDateStatus, formatDueDate, formatPostDate } from "./PostDueDateBadge";

interface PostCardProps {
  post: SocialMediaPost;
  compact?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  showArchived?: boolean;
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

const priorityConfig = {
  low: { label: "Baixa", color: "bg-blue-500" },
  medium: { label: "Média", color: "bg-yellow-500" },
  high: { label: "Alta", color: "bg-red-500" },
};

const getPriorityColor = (priority: string) => {
  return priorityConfig[priority as keyof typeof priorityConfig]?.color || "bg-gray-500";
};

const getPriorityLabel = (priority: string) => {
  return priorityConfig[priority as keyof typeof priorityConfig]?.label || priority;
};

// Obter data efetiva de postagem (post_date ou scheduled_date como fallback)
const getEffectivePostDate = (post: SocialMediaPost): string => {
  return post.post_date || post.scheduled_date;
};

// Obter data limite de entrega (due_date)
const getEffectiveDueDate = (post: SocialMediaPost): string | null | undefined => {
  return post.due_date;
};

export function PostCard({ post, compact = false, onClick, showArchived = false }: PostCardProps) {
  const PlatformIcon = platformIcons[post.platform as keyof typeof platformIcons] || Instagram;
  const ContentTypeIcon = contentTypeIcons[post.post_type as keyof typeof contentTypeIcons] || Image;
  const clientColor = getClientColor(post.client_id);
  const statusInfo = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
  const isArchived = showArchived && post.archived;
  
  const effectivePostDate = getEffectivePostDate(post);
  const effectiveDueDate = getEffectiveDueDate(post);
  const dueDateStatus = getDueDateStatus(effectiveDueDate, post.status);

  if (compact) {
    return (
      <div 
        className={cn(
          "text-xs p-1.5 rounded border cursor-pointer hover:brightness-95 transition-all",
          isArchived && "opacity-60 border-dashed"
        )}
        onClick={(e) => onClick?.(e)}
        style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
      >
        <div className="flex items-center gap-1">
          {isArchived && <Archive className="h-3 w-3 text-muted-foreground" />}
          <ContentTypeIcon className="h-3 w-3" />
          <span className="truncate flex-1">{post.title}</span>
          <div className={`h-2 w-2 rounded-full ${statusInfo.color}`} />
        </div>
        {/* Mostrar due_date no card compacto se existir e não estiver completo */}
        {effectiveDueDate && dueDateStatus && dueDateStatus.type !== 'completed' && dueDateStatus.type !== 'on_time' && (
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>Arte: {formatDueDate(effectiveDueDate)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border cursor-pointer hover:shadow-md hover:brightness-95 transition-all",
        isArchived && "opacity-60 border-dashed"
      )}
      onClick={(e) => onClick?.(e)}
      style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
    >
      {/* Badge de arquivado */}
      {isArchived && (
        <div className="flex items-center gap-1 mb-2">
          <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
            <Archive className="h-3 w-3" />
            Arquivado
          </Badge>
        </div>
      )}
      
      {/* Linha 1: Ícone + Badges */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <ContentTypeIcon className="h-5 w-5 flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          <Badge variant="outline" className={`${getPriorityColor(post.priority)} text-white text-xs`}>
            {getPriorityLabel(post.priority)}
          </Badge>
          {/* Badge de urgência baseado em due_date */}
          {!isArchived && (
            <PostDueDateBadge dueDate={effectiveDueDate} status={post.status} size="sm" />
          )}
        </div>
      </div>

      {/* Linha 2: Título */}
      <h3 className="font-semibold line-clamp-2 break-words mb-3">{post.title}</h3>
      
      {post.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {post.description}
        </p>
      )}
      
      {/* Linha 3: Datas - Post Date e Due Date */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1" title="Data de postagem">
          <Calendar className="h-3.5 w-3.5" />
          <span>Post: {formatPostDate(effectivePostDate)}</span>
        </div>
        {effectiveDueDate && (
          <div className="flex items-center gap-1" title="Data limite da arte">
            <Clock className="h-3.5 w-3.5" />
            <span>Arte até: {formatDueDate(effectiveDueDate)}</span>
          </div>
        )}
      </div>

      {/* Linha 4: Cliente */}
      {post.clients && (
        <div className="mb-2">
          <span 
            className="font-medium px-2 py-0.5 rounded text-xs"
            style={{ backgroundColor: clientColor, color: 'white' }}
          >
            {post.clients.name}
          </span>
        </div>
      )}

      {/* Linha 5: Usuários Atribuídos */}
      {post.assigned_users && post.assigned_users.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <div className="flex flex-wrap gap-1">
            {post.assigned_users.slice(0, 2).map((user, i) => (
              <span key={i} className="font-medium">
                {user.name}
              </span>
            ))}
            {post.assigned_users.length > 2 && (
              <span>+{post.assigned_users.length - 2}</span>
            )}
          </div>
        </div>
      )}

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
