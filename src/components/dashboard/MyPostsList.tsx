import { format, isToday, isBefore, startOfDay, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ChevronRight, Clock, Image } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title?: string;
  status: string;
  platform?: string;
  client_name?: string;
  scheduled_date?: string;
}

interface MyPostsListProps {
  posts: Post[];
  onViewAll?: () => void;
}

const platformIcons: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  linkedin: '💼',
  tiktok: '🎵',
  twitter: '🐦',
  youtube: '▶️',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending_approval: { label: 'Aprovação', className: 'border-amber-200 text-amber-700 bg-amber-50' },
  in_creation: { label: 'Em Criação', className: 'border-blue-200 text-blue-700 bg-blue-50' },
  revision: { label: 'Revisão', className: 'border-purple-200 text-purple-700 bg-purple-50' },
  approved: { label: 'Aprovado', className: 'border-green-200 text-green-700 bg-green-50' },
  scheduled: { label: 'Agendado', className: 'border-sky-200 text-sky-700 bg-sky-50' },
};

export function MyPostsList({ posts, onViewAll }: MyPostsListProps) {
  const today = startOfDay(new Date());

  const overduePosts = posts.filter(p => {
    if (!p.scheduled_date || p.status === 'published') return false;
    return isBefore(startOfDay(new Date(p.scheduled_date)), today);
  });

  const todayPosts = posts.filter(p => {
    if (!p.scheduled_date || p.status === 'published') return false;
    return isToday(new Date(p.scheduled_date));
  });

  const weekPosts = posts.filter(p => {
    if (!p.scheduled_date || p.status === 'published') return false;
    const d = new Date(p.scheduled_date);
    return !isToday(d) && !isBefore(d, today) && isThisWeek(d, { locale: ptBR });
  });

  // Posts sem data agendada mas pendentes
  const pendingNoDue = posts.filter(p => {
    if (p.status === 'published') return false;
    if (p.scheduled_date) return false;
    return ['pending_approval', 'revision', 'in_creation'].includes(p.status);
  });

  const PostRow = ({ post, showDate = false }: { post: Post; showDate?: boolean }) => {
    const isOverdue = post.scheduled_date && isBefore(startOfDay(new Date(post.scheduled_date)), today);
    const icon = platformIcons[post.platform?.toLowerCase() || ''] || '📄';
    const cfg = statusConfig[post.status] || { label: post.status, className: '' };

    return (
      <div className={cn(
        'flex items-start gap-3 py-2.5 border-b last:border-b-0',
        isOverdue && 'bg-destructive/5 rounded-lg px-2 -mx-2',
      )}>
        <span className="text-base shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-snug line-clamp-2',
            isOverdue && 'text-destructive',
          )}>
            {post.title || 'Sem título'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {post.client_name && (
              <span className="text-xs text-muted-foreground">{post.client_name}</span>
            )}
            {showDate && post.scheduled_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(post.scheduled_date), "d MMM", { locale: ptBR })}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn('text-[10px] shrink-0 whitespace-nowrap', cfg.className)}>
          {cfg.label}
        </Badge>
      </div>
    );
  };

  const isEmpty = overduePosts.length === 0 && todayPosts.length === 0 && weekPosts.length === 0 && pendingNoDue.length === 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            Meus Posts
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs gap-1">
            Ver todos <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
        {isEmpty && (
          <p className="text-sm text-muted-foreground text-center py-6">
            🎉 Nenhum post pendente!
          </p>
        )}

        {overduePosts.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide">
                Atrasados ({overduePosts.length})
              </h4>
            </div>
            <div>
              {overduePosts.map(p => <PostRow key={p.id} post={p} showDate />)}
            </div>
          </div>
        )}

        {todayPosts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Hoje ({todayPosts.length})
            </h4>
            <div>
              {todayPosts.map(p => <PostRow key={p.id} post={p} />)}
            </div>
          </div>
        )}

        {weekPosts.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Esta Semana ({weekPosts.length})
            </h4>
            <div>
              {weekPosts.map(p => <PostRow key={p.id} post={p} showDate />)}
            </div>
          </div>
        )}

        {pendingNoDue.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Pendentes ({pendingNoDue.length})
            </h4>
            <div>
              {pendingNoDue.map(p => <PostRow key={p.id} post={p} />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
