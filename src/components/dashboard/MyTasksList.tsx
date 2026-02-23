import { format, isToday, isBefore, startOfDay, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ChevronRight, Clock, CircleDot, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  clients?: { name: string } | null;
}

interface MyTasksListProps {
  tasks: Task[];
  onTasksChange?: () => void;
  onViewAll?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  todo: { label: 'Pendente', className: 'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800' },
  in_progress: { label: 'Em andamento', className: 'border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/40' },
  in_review: { label: 'Em revisão', className: 'border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-900/40' },
  em_revisao: { label: 'Em revisão', className: 'border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-900/40' },
  done: { label: 'Concluída', className: 'border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-900/40' },
};

function getTaskStatusConfig(status: string) {
  return statusConfig[status] || { label: status, className: 'border-gray-200 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-800' };
}

export function MyTasksList({ tasks, onViewAll }: MyTasksListProps) {
  const today = startOfDay(new Date());

  const overdueTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return isBefore(startOfDay(new Date(t.due_date)), today);
  });

  const todayTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return isToday(new Date(t.due_date));
  });

  const weekTasks = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    const d = new Date(t.due_date);
    return !isToday(d) && !isBefore(d, today) && isThisWeek(d, { locale: ptBR });
  });

  const TaskRow = ({ task, showDate = false }: { task: Task; showDate?: boolean }) => {
    const isOverdue = task.due_date && isBefore(startOfDay(new Date(task.due_date)), today);
    const cfg = getTaskStatusConfig(task.status);

    return (
      <div className={cn(
        'flex items-start gap-3 py-2.5 border-b last:border-b-0',
        isOverdue && 'bg-destructive/5 rounded-lg px-2 -mx-2',
      )}>
        <CircleDot className={cn('h-4 w-4 mt-0.5 shrink-0', isOverdue ? 'text-destructive' : 'text-muted-foreground')} />
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-sm font-medium leading-snug line-clamp-2',
            isOverdue && 'text-destructive',
          )}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {task.clients?.name && (
              <span className="text-xs text-muted-foreground">{task.clients.name}</span>
            )}
            {showDate && task.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(task.due_date), "d MMM", { locale: ptBR })}
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

  const isEmpty = overdueTasks.length === 0 && todayTasks.length === 0 && weekTasks.length === 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Minhas Tarefas
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs gap-1">
            Ver todas <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty && (
          <p className="text-sm text-muted-foreground text-center py-6">
            🎉 Nenhuma tarefa pendente!
          </p>
        )}

        {overdueTasks.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <h4 className="text-xs font-semibold text-destructive uppercase tracking-wide">
                Atrasadas ({overdueTasks.length})
              </h4>
            </div>
            <div>
              {overdueTasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
            </div>
          </div>
        )}

        {todayTasks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Hoje ({todayTasks.length})
            </h4>
            <div>
              {todayTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          </div>
        )}

        {weekTasks.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Esta Semana ({weekTasks.length})
            </h4>
            <div>
              {weekTasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
