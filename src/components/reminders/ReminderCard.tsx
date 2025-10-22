import { Reminder } from '@/hooks/useReminders';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Flag, MoreVertical, Calendar, Bell, Repeat, List } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

interface ReminderCardProps {
  reminder: Reminder;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
}

export function ReminderCard({ reminder, onToggle, onEdit, onDelete }: ReminderCardProps) {
  const isOverdue = reminder.reminder_time && isPast(new Date(reminder.reminder_time)) && !reminder.completed;
  const completedSubtasks = reminder.subtasks.filter(st => st.completed).length;

  const getPriorityColor = () => {
    switch (reminder.priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getDateDisplay = () => {
    if (!reminder.reminder_time) return null;
    const date = new Date(reminder.reminder_time);
    
    if (isToday(date)) {
      return `Hoje às ${format(date, 'HH:mm')}`;
    } else if (isTomorrow(date)) {
      return `Amanhã às ${format(date, 'HH:mm')}`;
    } else {
      return format(date, "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
    }
  };

  return (
    <Card className={cn(
      "p-4 transition-all hover:shadow-md",
      reminder.completed && "opacity-60",
      isOverdue && "border-red-300"
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={reminder.completed}
          onCheckedChange={(checked) => onToggle(reminder.id, checked as boolean)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={cn(
              "font-medium",
              reminder.completed && "line-through text-muted-foreground"
            )}>
              {reminder.title}
            </h3>
            {reminder.is_flagged && <Flag className="h-4 w-4 fill-current text-red-500" />}
            {reminder.priority !== 'none' && (
              <Badge variant="outline" className={cn("text-xs", getPriorityColor())}>
                {reminder.priority === 'high' ? 'Alta' : reminder.priority === 'medium' ? 'Média' : 'Baixa'}
              </Badge>
            )}
          </div>

          {reminder.notes && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {reminder.notes}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {reminder.reminder_time && (
              <span className={cn(
                "flex items-center gap-1",
                isOverdue && "text-red-600 font-medium"
              )}>
                <Calendar className="h-3 w-3" />
                {getDateDisplay()}
              </span>
            )}
            
            {reminder.recurrence_type !== 'none' && (
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {reminder.recurrence_type === 'daily' ? 'Diário' :
                 reminder.recurrence_type === 'weekly' ? 'Semanal' :
                 reminder.recurrence_type === 'monthly' ? 'Mensal' : 'Anual'}
              </span>
            )}

            {reminder.notification_enabled && (
              <span className="flex items-center gap-1">
                <Bell className="h-3 w-3" />
              </span>
            )}

            {reminder.subtasks.length > 0 && (
              <span className="flex items-center gap-1">
                <List className="h-3 w-3" />
                {completedSubtasks}/{reminder.subtasks.length}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(reminder)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(reminder.id)}
              className="text-red-600"
            >
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
