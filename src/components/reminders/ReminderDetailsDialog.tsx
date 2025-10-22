import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Reminder } from '@/hooks/useReminders';
import { Calendar, Bell, Repeat, Flag, List, Clock, Edit, Trash2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ReminderDetailsDialogProps {
  reminder: Reminder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (subtaskId: string) => void;
}

export function ReminderDetailsDialog({
  reminder,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleSubtask,
}: ReminderDetailsDialogProps) {
  if (!reminder) return null;

  const isOverdue = reminder.reminder_time && isPast(new Date(reminder.reminder_time)) && !reminder.completed;

  const getPriorityColor = () => {
    switch (reminder.priority) {
      case 'high': return 'text-red-600 border-red-600';
      case 'medium': return 'text-yellow-600 border-yellow-600';
      case 'low': return 'text-blue-600 border-blue-600';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityLabel = () => {
    switch (reminder.priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Nenhuma';
    }
  };

  const getRecurrenceLabel = () => {
    switch (reminder.recurrence_type) {
      case 'daily': return 'Diariamente';
      case 'weekly': return 'Semanalmente';
      case 'monthly': return 'Mensalmente';
      case 'yearly': return 'Anualmente';
      default: return 'Não repete';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {reminder.title}
              {reminder.is_flagged && <Flag className="h-5 w-5 fill-current text-red-500" />}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(reminder);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este lembrete?')) {
                    onDelete(reminder.id);
                    onOpenChange(false);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status */}
          {reminder.completed && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                ✓ Concluído em {format(new Date(reminder.completed_at!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          )}

          {isOverdue && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                ⚠️ Este lembrete está atrasado
              </p>
            </div>
          )}

          {/* Notas */}
          {reminder.notes && (
            <div>
              <h3 className="text-sm font-medium mb-2">Notas</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reminder.notes}</p>
            </div>
          )}

          <Separator />

          {/* Informações */}
          <div className="grid grid-cols-2 gap-4">
            {reminder.reminder_time && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Data e Hora</p>
                  <p className={cn(
                    "text-sm",
                    isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                  )}>
                    {format(new Date(reminder.reminder_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}

            {reminder.priority !== 'none' && (
              <div className="flex items-start gap-3">
                <Flag className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Prioridade</p>
                  <Badge variant="outline" className={cn("mt-1", getPriorityColor())}>
                    {getPriorityLabel()}
                  </Badge>
                </div>
              </div>
            )}

            {reminder.recurrence_type !== 'none' && (
              <div className="flex items-start gap-3">
                <Repeat className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Repetição</p>
                  <p className="text-sm text-muted-foreground">{getRecurrenceLabel()}</p>
                </div>
              </div>
            )}

            {reminder.notification_enabled && (
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Notificação</p>
                  <p className="text-sm text-muted-foreground">
                    {reminder.notification_minutes_before === 0
                      ? 'Na hora'
                      : `${reminder.notification_minutes_before} min antes`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Subtarefas */}
          {reminder.subtasks && reminder.subtasks.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <List className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-medium">
                    Subtarefas ({reminder.subtasks.filter(st => st.completed).length}/{reminder.subtasks.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {reminder.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={subtask.completed}
                        onCheckedChange={() => onToggleSubtask(subtask.id)}
                      />
                      <span className={cn(
                        "text-sm flex-1",
                        subtask.completed && "line-through text-muted-foreground"
                      )}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tags */}
          {reminder.tags && reminder.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {reminder.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Informações de criação */}
          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              Criado em {format(new Date(reminder.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
