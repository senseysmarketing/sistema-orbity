import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Image, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  duration_minutes?: number;
  client_name?: string;
  status: string;
}

interface Post {
  id: string;
  title?: string;
  status: string;
  platform?: string;
  client_name?: string;
  scheduled_date?: string;
}

interface MyAgendaAndPostsProps {
  meetings: Meeting[];
  posts: Post[];
  onViewAgenda?: () => void;
  onViewPosts?: () => void;
}

const postStatusConfig: Record<string, { label: string; className: string }> = {
  pending_approval: { label: 'Aguardando Aprovação', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  in_creation: { label: 'Em Criação', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Aprovado', className: 'bg-green-100 text-green-800 border-green-200' },
  published: { label: 'Publicado', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  revision: { label: 'Em Revisão', className: 'bg-purple-100 text-purple-800 border-purple-200' },
};

const platformIcons: Record<string, string> = {
  instagram: '📸',
  facebook: '📘',
  linkedin: '💼',
  tiktok: '🎵',
  twitter: '🐦',
  youtube: '▶️',
};

export function MyAgendaAndPosts({ meetings, posts, onViewAgenda, onViewPosts }: MyAgendaAndPostsProps) {
  const todayMeetings = meetings
    .filter(m => isToday(new Date(m.start_time)) && m.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const pendingPosts = posts.filter(p => 
    ['pending_approval', 'in_creation', 'revision'].includes(p.status)
  );

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Agenda & Posts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Reuniões de Hoje */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Reuniões Hoje
              </h4>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewAgenda} className="text-xs gap-1 h-7 px-2">
              Ver <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {todayMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhuma reunião hoje</p>
          ) : (
            <div className="space-y-2">
              {todayMeetings.map(meeting => (
                <div key={meeting.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 border">
                  <div className="flex flex-col items-center shrink-0 min-w-[44px]">
                    <Clock className="h-3.5 w-3.5 text-primary mb-0.5" />
                    <span className="text-xs font-bold text-primary">
                      {format(new Date(meeting.start_time), 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{meeting.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {meeting.client_name && (
                        <span className="text-xs text-muted-foreground">{meeting.client_name}</span>
                      )}
                      {meeting.duration_minutes && (
                        <span className="text-xs text-muted-foreground">
                          {meeting.duration_minutes}min
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="border-t" />

        {/* Posts para Revisar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Image className="h-4 w-4 text-primary" />
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Posts Atribuídos
              </h4>
            </div>
            <Button variant="ghost" size="sm" onClick={onViewPosts} className="text-xs gap-1 h-7 px-2">
              Ver <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          {pendingPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhum post pendente</p>
          ) : (
            <div className="space-y-2">
              {pendingPosts.slice(0, 5).map(post => {
                const statusCfg = postStatusConfig[post.status] || { label: post.status, className: '' };
                const platformIcon = platformIcons[post.platform?.toLowerCase() || ''] || '📄';
                return (
                  <div key={post.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border">
                    <span className="text-base shrink-0">{platformIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {post.title || 'Sem título'}
                      </p>
                      {post.client_name && (
                        <p className="text-xs text-muted-foreground">{post.client_name}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('text-[10px] shrink-0 whitespace-nowrap', statusCfg.className)}
                    >
                      {statusCfg.label}
                    </Badge>
                  </div>
                );
              })}
              {pendingPosts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{pendingPosts.length - 5} posts
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
