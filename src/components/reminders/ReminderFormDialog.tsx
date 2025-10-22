import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Reminder, RecurrenceType, ReminderPriority } from '@/hooks/useReminders';
import { ReminderList, useReminderLists } from '@/hooks/useReminderLists';
import { CalendarIcon, Bell, Flag, List, Repeat, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { cn } from '@/lib/utils';

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder | null;
  onCreate: (data: Partial<Reminder>) => Promise<void> | void;
  onUpdate: (id: string, data: Partial<Reminder>) => Promise<void> | void;
}

export function ReminderFormDialog({ open, onOpenChange, reminder, onCreate, onUpdate }: ReminderFormDialogProps) {
  const { lists } = useReminderLists();
  
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderDate, setReminderDate] = useState<Date>();
  const [reminderTime, setReminderTime] = useState('');
  const [listId, setListId] = useState<string>('');
  const [priority, setPriority] = useState<ReminderPriority>('none');
  const [isFlagged, setIsFlagged] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [notificationMinutes, setNotificationMinutes] = useState(0);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [subtasks, setSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setNotes(reminder.notes || '');
      if (reminder.reminder_time) {
        // Convert UTC to local timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const utcDate = new Date(reminder.reminder_time);
        const localDate = toZonedTime(utcDate, timezone);
        setReminderDate(localDate);
        setReminderTime(format(localDate, 'HH:mm'));
      }
      setListId(reminder.list_id || '');
      setPriority(reminder.priority);
      setIsFlagged(reminder.is_flagged);
      setRecurrenceType(reminder.recurrence_type);
      setRecurrenceInterval(reminder.recurrence_interval || 1);
      setRecurrenceDays(reminder.recurrence_days_of_week || []);
      setNotificationEnabled(reminder.notification_enabled);
      setNotificationMinutes(reminder.notification_minutes_before);
      setSubtasks(reminder.subtasks || []);
    } else {
      resetForm();
    }
  }, [reminder, open]);

  const resetForm = () => {
    setTitle('');
    setNotes('');
    setReminderDate(undefined);
    setReminderTime('');
    setListId('');
    setPriority('none');
    setIsFlagged(false);
    setRecurrenceType('none');
    setRecurrenceInterval(1);
    setRecurrenceDays([]);
    setNotificationEnabled(true);
    setNotificationMinutes(0);
    setSubtasks([]);
    setSubtaskInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let reminderTimeISO = null;
    if (reminderDate) {
      const [hours, minutes] = reminderTime ? reminderTime.split(':') : ['00', '00'];
      const dateTime = new Date(reminderDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes));
      
      // Convert local timezone to UTC
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const utcDate = fromZonedTime(dateTime, timezone);
      reminderTimeISO = utcDate.toISOString();
    }

    const data = {
      title,
      notes,
      reminder_time: reminderTimeISO,
      list_id: listId || null,
      priority,
      is_flagged: isFlagged,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_days_of_week: recurrenceDays,
      notification_enabled: notificationEnabled,
      notification_minutes_before: notificationMinutes,
      subtasks,
    };

    if (reminder) {
      await onUpdate(reminder.id, data);
    } else {
      await onCreate(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const addSubtask = () => {
    if (subtaskInput.trim()) {
      setSubtasks([...subtasks, {
        id: crypto.randomUUID(),
        title: subtaskInput.trim(),
        completed: false,
      }]);
      setSubtaskInput('');
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleDay = (day: number) => {
    setRecurrenceDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reminder ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do lembrete..."
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione notas..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reminderDate ? format(reminderDate, 'dd/MM/yyyy') : 'Selecionar data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={setReminderDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="time">Hora</Label>
              <Input
                id="time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="list">Lista (Opcional)</Label>
            <Select value={listId || undefined} onValueChange={(value) => setListId(value || '')}>
              <SelectTrigger id="list">
                <SelectValue placeholder="Sem lista" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    <span className="flex items-center gap-2">
                      <span>{list.icon}</span>
                      <span>{list.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ReminderPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Label className="flex items-center gap-2 cursor-pointer">
                <Flag className={cn("h-4 w-4", isFlagged && "fill-current text-red-500")} />
                <span>Sinalizado</span>
                <Switch checked={isFlagged} onCheckedChange={setIsFlagged} />
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="recurrence">Repetição</Label>
            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}>
              <SelectTrigger id="recurrence">
                <Repeat className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nunca</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="yearly">Anualmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === 'weekly' && (
            <div>
              <Label>Dias da semana</Label>
              <div className="flex gap-2 mt-2">
                {weekDays.map((day, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={recurrenceDays.includes(index) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(index)}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notificações</Label>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <Switch checked={notificationEnabled} onCheckedChange={setNotificationEnabled} />
              <span className="text-sm">Ativar notificações</span>
            </div>
            {notificationEnabled && (
              <Select
                value={notificationMinutes.toString()}
                onValueChange={(v) => setNotificationMinutes(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Na hora</SelectItem>
                  <SelectItem value="5">5 minutos antes</SelectItem>
                  <SelectItem value="15">15 minutos antes</SelectItem>
                  <SelectItem value="30">30 minutos antes</SelectItem>
                  <SelectItem value="60">1 hora antes</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Subtarefas</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                placeholder="Adicionar subtarefa..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
              />
              <Button type="button" size="icon" onClick={addSubtask}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {subtasks.length > 0 && (
              <div className="mt-2 space-y-1">
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <List className="h-4 w-4" />
                    <span className="flex-1 text-sm">{subtask.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubtask(subtask.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {reminder ? 'Atualizar' : 'Criar'} Lembrete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
