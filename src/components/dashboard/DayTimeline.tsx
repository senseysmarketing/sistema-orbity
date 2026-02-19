import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Clock, CheckSquare, Calendar, Image, Target, Bell, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  action_url?: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  task: { icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-primary bg-primary/10' },
  meeting: { icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-600 bg-blue-100' },
  post: { icon: <Image className="h-3.5 w-3.5" />, color: 'text-purple-600 bg-purple-100' },
  lead: { icon: <Target className="h-3.5 w-3.5" />, color: 'text-amber-600 bg-amber-100' },
  default: { icon: <Bell className="h-3.5 w-3.5" />, color: 'text-muted-foreground bg-muted' },
};

export function DayTimeline() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    if (!profile || !currentAgency) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, message, created_at, action_url')
      .eq('user_id', profile.user_id)
      .eq('agency_id', currentAgency.id)
      .gte('created_at', `${todayStr}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(15);

    setEvents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [profile?.user_id, currentAgency?.id]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Linha do Tempo de Hoje
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda hoje</p>
          </div>
        ) : (
          <div className="space-y-0 max-h-[340px] overflow-y-auto">
            {events.map((event, idx) => {
              const cfg = typeConfig[event.type] || typeConfig.default;
              return (
                <div key={event.id} className="flex gap-3 group">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1', cfg.color)}>
                      {cfg.icon}
                    </div>
                    {idx < events.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={cn('flex-1 pb-3 min-w-0', idx === events.length - 1 && 'pb-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {format(new Date(event.created_at), 'HH:mm')}
                        </p>
                        <p className="text-sm font-medium leading-snug line-clamp-1">{event.title}</p>
                        {event.message && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{event.message}</p>
                        )}
                      </div>
                      {event.action_url && (
                        <a
                          href={event.action_url}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
