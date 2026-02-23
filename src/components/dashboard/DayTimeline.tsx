import { useEffect, useState, useCallback } from 'react';
import { format, getISOWeek, getMonth, getYear, getDay, getDate } from 'date-fns';
import { Clock, CheckSquare, Calendar, Image, Target, Bell, ChevronRight, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { cn } from '@/lib/utils';
import { Routine, Completion, toISODay, isWeeklyDayCompleted, isWeeklyDayLate, isRoutineLate } from './RoutineBlock';

interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  action_url?: string;
}

type RoutineStatus = 'pending' | 'late' | 'done';

interface TimelineItem {
  id: string;
  time: string;
  source: 'notification' | 'routine' | 'task' | 'post';
  notif?: TimelineEvent;
  routine?: Routine;
  routineStatus?: RoutineStatus;
  itemTitle?: string;
  itemStatus?: string;
  itemClientName?: string;
  isRequested?: boolean;
}

const notifTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  task: { icon: <CheckSquare className="h-3.5 w-3.5" />, color: 'text-primary bg-primary/10' },
  meeting: { icon: <Calendar className="h-3.5 w-3.5" />, color: 'text-blue-600 bg-blue-100' },
  post: { icon: <Image className="h-3.5 w-3.5" />, color: 'text-purple-600 bg-purple-100' },
  lead: { icon: <Target className="h-3.5 w-3.5" />, color: 'text-amber-600 bg-amber-100' },
  default: { icon: <Bell className="h-3.5 w-3.5" />, color: 'text-muted-foreground bg-muted' },
};

function routineStatusConfig(status: RoutineStatus) {
  if (status === 'done') return { color: 'text-primary bg-primary/10', label: 'Concluída' };
  if (status === 'late') return { color: 'text-destructive bg-destructive/10', label: 'Atrasada' };
  return { color: 'text-indigo-600 bg-indigo-100', label: 'Pendente' };
}

export function DayTimeline() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentWeek = getISOWeek(now);
  const currentMonth = getMonth(now) + 1;
  const currentYear = getYear(now);
  const isoToday = toISODay(getDay(now));
  const todayDate = getDate(now);

  const fetchData = useCallback(async () => {
    if (!profile || !currentAgency) return;
    const todayStr = new Date().toISOString().split('T')[0];

    const [notifsRes, routinesRes, completionsRes, taskAssignRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, type, title, message, created_at, action_url')
        .eq('user_id', profile.user_id)
        .eq('agency_id', currentAgency.id)
        .gte('created_at', `${todayStr}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('routines')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('is_active', true)
        .not('scheduled_time', 'is', null),
      supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('year', currentYear),
      supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', profile.user_id),
    ]);

    const notifs: TimelineEvent[] = notifsRes.data || [];
    const routines: Routine[] = (routinesRes.data || []) as Routine[];
    const completions: Completion[] = (completionsRes.data || []) as Completion[];
    const myTaskIds = (taskAssignRes.data || []).map((a: any) => a.task_id);

    // Fetch ALL tasks for today (both regular and social media — unified)
    const assignedTasksRes = myTaskIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id, title, status, due_date, task_type, metadata, clients(name)')
          .eq('agency_id', currentAgency.id)
          .eq('archived', false)
          .gte('due_date', `${todayStr}T00:00:00`)
          .lte('due_date', `${todayStr}T23:59:59`)
          .in('id', myTaskIds)
      : { data: [] };

    const createdTasksRes = await supabase
      .from('tasks')
      .select('id, title, status, due_date, task_type, metadata, clients(name)')
      .eq('agency_id', currentAgency.id)
      .eq('created_by', profile.user_id)
      .eq('archived', false)
      .gte('due_date', `${todayStr}T00:00:00`)
      .lte('due_date', `${todayStr}T23:59:59`);

    // Merge and deduplicate tasks
    const allTasks = [...(assignedTasksRes.data || [])];
    const taskIdSet = new Set(allTasks.map((t: any) => t.id));
    const createdOnlyTasks = ((createdTasksRes.data || []) as any[]).filter((t: any) => !taskIdSet.has(t.id));

    // Filter routines applicable to today
    const todayRoutines = routines.filter(r => {
      if (r.type === 'weekly') {
        return (r.week_days || []).includes(isoToday);
      } else {
        return r.day_of_month === todayDate;
      }
    });

    // Build timeline items from notifications
    const notifItems: TimelineItem[] = notifs.map(n => ({
      id: `notif-${n.id}`,
      time: format(new Date(n.created_at), 'HH:mm'),
      source: 'notification',
      notif: n,
    }));

    // Build timeline items from routines
    const routineItems: TimelineItem[] = todayRoutines.map(r => {
      let isDone: boolean;
      let late: boolean;
      if (r.type === 'weekly') {
        isDone = isWeeklyDayCompleted(r.id, isoToday, currentWeek, currentYear, completions);
        late = !isDone && isWeeklyDayLate(r, isoToday, now, currentWeek, currentYear, completions);
      } else {
        isDone = completions.some(c => c.routine_id === r.id && c.month_number === currentMonth && c.year === currentYear);
        late = !isDone && isRoutineLate(r, now, currentWeek, currentMonth, currentYear, completions);
      }
      const status: RoutineStatus = isDone ? 'done' : late ? 'late' : 'pending';

      return {
        id: `routine-${r.id}`,
        time: r.scheduled_time!.slice(0, 5),
        source: 'routine',
        routine: r,
        routineStatus: status,
      };
    });

    // Build timeline items from tasks (both regular and social media)
    const buildTaskItem = (t: any, isRequested: boolean): TimelineItem => {
      const dueDate = new Date(t.due_date);
      const timeStr = format(dueDate, 'HH:mm');
      const isSocialMedia = t.task_type === 'redes_sociais';
      return {
        id: `${isRequested ? 'task-req' : 'task'}-${t.id}`,
        time: timeStr === '00:00' ? (isSocialMedia ? '09:00' : '08:00') : timeStr,
        source: isSocialMedia ? 'post' : 'task',
        itemTitle: t.title || (isSocialMedia ? 'Post sem título' : t.title),
        itemStatus: t.status,
        itemClientName: t.clients?.name,
        isRequested,
      };
    };

    const taskItems: TimelineItem[] = allTasks.map((t: any) => buildTaskItem(t, false));
    const requestedTaskItems: TimelineItem[] = createdOnlyTasks.map((t: any) => buildTaskItem(t, true));

    // Merge and sort chronologically
    const merged = [
      ...routineItems,
      ...taskItems,
      ...requestedTaskItems,
      ...notifItems,
    ].sort((a, b) => {
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      const priority = { routine: 0, task: 1, post: 2, notification: 3 };
      return (priority[a.source] || 3) - (priority[b.source] || 3);
    });

    setItems(merged);
    setLoading(false);
  }, [profile?.user_id, currentAgency?.id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleRoutine = async (routine: Routine) => {
    if (!profile) return;

    if (routine.type === 'weekly') {
      const isDone = items.find(i => i.source === 'routine' && i.routine?.id === routine.id)?.routineStatus === 'done';
      if (isDone) {
        const { data: comps } = await supabase
          .from('routine_completions')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('routine_id', routine.id)
          .eq('year', currentYear);

        const comp = (comps || []).find((c: any) =>
          c.week_number === currentWeek && c.day_of_week === isoToday
        );
        if (comp) {
          await supabase.from('routine_completions').delete().eq('id', comp.id);
        }
      } else {
        const payload: any = {
          routine_id: routine.id,
          user_id: profile.user_id,
          year: currentYear,
          week_number: currentWeek,
          day_of_week: isoToday,
        };
        await supabase.from('routine_completions').insert(payload);
      }
    } else {
      const isDone = items.find(i => i.source === 'routine' && i.routine?.id === routine.id)?.routineStatus === 'done';
      if (isDone) {
        const { data: comps } = await supabase
          .from('routine_completions')
          .select('*')
          .eq('user_id', profile.user_id)
          .eq('routine_id', routine.id)
          .eq('year', currentYear);

        const comp = (comps || []).find((c: any) => c.month_number === currentMonth);
        if (comp) {
          await supabase.from('routine_completions').delete().eq('id', comp.id);
        }
      } else {
        const payload: any = { routine_id: routine.id, user_id: profile.user_id, year: currentYear, month_number: currentMonth };
        await supabase.from('routine_completions').insert(payload);
      }
    }

    fetchData();
  };

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
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda hoje</p>
          </div>
        ) : (
          <div className="space-y-0 max-h-[340px] overflow-y-auto">
            {items.map((item, idx) => {
              if (item.source === 'routine' && item.routine) {
                const { color } = routineStatusConfig(item.routineStatus!);
                const isDone = item.routineStatus === 'done';
                const isLateItem = item.routineStatus === 'late';

                return (
                  <div key={item.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1', color)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </div>
                      {idx < items.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
                      )}
                    </div>

                    <div className={cn('flex-1 pb-3 min-w-0', idx === items.length - 1 && 'pb-0')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs text-muted-foreground font-medium">{item.time}</p>
                            <Badge variant="outline" className={cn('text-[10px] h-4 px-1 border-0', color)}>
                              Rotina
                            </Badge>
                            {isLateItem && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-destructive/30 text-destructive bg-destructive/5">
                                Atrasada
                              </Badge>
                            )}
                          </div>
                          <p className={cn('text-sm font-medium leading-snug line-clamp-1', isDone && 'line-through text-muted-foreground')}>
                            {item.routine.title}
                          </p>
                        </div>
                        <Checkbox
                          checked={isDone}
                          onCheckedChange={() => handleToggleRoutine(item.routine!)}
                          className="shrink-0 mt-0.5 h-4 w-4"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              if (item.source === 'task') {
                const isDone = item.itemStatus === 'done';
                return (
                  <div key={item.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1', isDone ? 'text-primary bg-primary/10' : 'text-primary bg-primary/10')}>
                        <CheckSquare className="h-3.5 w-3.5" />
                      </div>
                      {idx < items.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
                      )}
                    </div>
                    <div className={cn('flex-1 pb-3 min-w-0', idx === items.length - 1 && 'pb-0')}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs text-muted-foreground font-medium">{item.time}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-0 text-primary bg-primary/10">
                          Tarefa
                        </Badge>
                        {item.isRequested && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300/50 text-amber-600 bg-amber-50">
                            Solicitada
                          </Badge>
                        )}
                      </div>
                      <p className={cn('text-sm font-medium leading-snug line-clamp-1', isDone && 'line-through text-muted-foreground')}>
                        {item.itemTitle}
                      </p>
                      {item.itemClientName && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.itemClientName}</p>
                      )}
                    </div>
                  </div>
                );
              }

              if (item.source === 'post') {
                return (
                  <div key={item.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1 text-purple-600 bg-purple-100">
                        <Image className="h-3.5 w-3.5" />
                      </div>
                      {idx < items.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
                      )}
                    </div>
                    <div className={cn('flex-1 pb-3 min-w-0', idx === items.length - 1 && 'pb-0')}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs text-muted-foreground font-medium">{item.time}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-0 text-purple-600 bg-purple-100">
                          Post
                        </Badge>
                        {item.isRequested && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300/50 text-amber-600 bg-amber-50">
                            Solicitado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-snug line-clamp-1">
                        {item.itemTitle}
                      </p>
                      {item.itemClientName && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{item.itemClientName}</p>
                      )}
                    </div>
                  </div>
                );
              }

              // Notification item
              const notif = item.notif!;
              const cfg = notifTypeConfig[notif.type] || notifTypeConfig.default;

              return (
                <div key={item.id} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1', cfg.color)}>
                      {cfg.icon}
                    </div>
                    {idx < items.length - 1 && (
                      <div className="w-px flex-1 bg-border my-1 min-h-[12px]" />
                    )}
                  </div>

                  <div className={cn('flex-1 pb-3 min-w-0', idx === items.length - 1 && 'pb-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground font-medium">
                          {format(new Date(notif.created_at), 'HH:mm')}
                        </p>
                        <p className="text-sm font-medium leading-snug line-clamp-1">{notif.title}</p>
                        {notif.message && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                        )}
                      </div>
                      {notif.action_url && (
                        <a
                          href={notif.action_url}
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
