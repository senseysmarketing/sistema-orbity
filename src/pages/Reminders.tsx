import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Bell, Calendar as CalendarIcon, Flag, CheckCircle2, List as ListIcon } from 'lucide-react';
import { Reminder, useReminders } from '@/hooks/useReminders';
import { useReminderLists } from '@/hooks/useReminderLists';
import { useNotifications } from '@/hooks/useNotifications';
import { ReminderFormDialog } from '@/components/reminders/ReminderFormDialog';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { isToday, isTomorrow, isPast, isThisWeek, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Reminders() {
  const { reminders, loading, toggleReminder, deleteReminder } = useReminders();
  const { lists } = useReminderLists();
  const { permission, requestPermission, showNotification } = useNotifications();
  const [search, setSearch] = useState('');
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'scheduled' | 'flagged' | 'completed'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, []);

  // Check for pending notifications
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      reminders.forEach(reminder => {
        if (
          !reminder.completed &&
          reminder.notification_enabled &&
          reminder.reminder_time
        ) {
          const reminderTime = new Date(reminder.reminder_time);
          const notifyTime = new Date(reminderTime.getTime() - reminder.notification_minutes_before * 60000);
          
          if (now >= notifyTime && now < reminderTime) {
            const lastSent = reminder.last_notification_sent ? new Date(reminder.last_notification_sent) : null;
            const shouldNotify = !lastSent || (now.getTime() - lastSent.getTime()) > 60000;
            
            if (shouldNotify) {
              showNotification(reminder.title, {
                body: reminder.notes || 'Você tem um lembrete pendente',
                tag: reminder.id,
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkNotifications, 60000); // Check every minute
    checkNotifications(); // Check immediately

    return () => clearInterval(interval);
  }, [reminders, showNotification]);

  const filteredReminders = useMemo(() => {
    let filtered = reminders;

    // Filter by search
    if (search) {
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.notes?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by list
    if (selectedList) {
      filtered = filtered.filter(r => r.list_id === selectedList);
    }

    // Filter by type
    switch (selectedFilter) {
      case 'today':
        filtered = filtered.filter(r =>
          r.reminder_time && isToday(new Date(r.reminder_time)) && !r.completed
        );
        break;
      case 'scheduled':
        filtered = filtered.filter(r => r.reminder_time && !r.completed);
        break;
      case 'flagged':
        filtered = filtered.filter(r => r.is_flagged && !r.completed);
        break;
      case 'completed':
        filtered = filtered.filter(r => r.completed);
        break;
    }

    return filtered;
  }, [reminders, search, selectedList, selectedFilter]);

  const groupedReminders = useMemo(() => {
    const groups: Record<string, Reminder[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      noDate: [],
    };

    filteredReminders.forEach(reminder => {
      if (!reminder.reminder_time) {
        groups.noDate.push(reminder);
        return;
      }

      const date = new Date(reminder.reminder_time);
      const now = startOfDay(new Date());

      if (!reminder.completed && isPast(date) && date < now) {
        groups.overdue.push(reminder);
      } else if (isToday(date)) {
        groups.today.push(reminder);
      } else if (isTomorrow(date)) {
        groups.tomorrow.push(reminder);
      } else if (isThisWeek(date)) {
        groups.thisWeek.push(reminder);
      } else {
        groups.later.push(reminder);
      }
    });

    return groups;
  }, [filteredReminders]);

  const stats = useMemo(() => {
    const total = reminders.length;
    const completed = reminders.filter(r => r.completed).length;
    const today = reminders.filter(r =>
      r.reminder_time && isToday(new Date(r.reminder_time)) && !r.completed
    ).length;
    const overdue = reminders.filter(r =>
      r.reminder_time && isPast(new Date(r.reminder_time)) && !r.completed
    ).length;

    return { total, completed, today, overdue };
  }, [reminders]);

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lembrete?')) {
      await deleteReminder(id);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingReminder(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando lembretes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lembretes</h1>
          <p className="text-muted-foreground">Gerencie seus lembretes e tarefas</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lembrete
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className={cn(stats.overdue > 0 && "border-red-300")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.overdue > 0 && "text-red-600")}>
              {stats.overdue}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lembretes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {permission === 'default' && (
          <Button variant="outline" onClick={requestPermission}>
            <Bell className="h-4 w-4 mr-2" />
            Ativar Notificações
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant={selectedFilter === 'all' && !selectedList ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setSelectedFilter('all'); setSelectedList(null); }}
            >
              <ListIcon className="h-4 w-4 mr-2" />
              Todos
            </Button>
            <Button
              variant={selectedFilter === 'today' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setSelectedFilter('today'); setSelectedList(null); }}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Hoje
            </Button>
            <Button
              variant={selectedFilter === 'scheduled' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setSelectedFilter('scheduled'); setSelectedList(null); }}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Agendados
            </Button>
            <Button
              variant={selectedFilter === 'flagged' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setSelectedFilter('flagged'); setSelectedList(null); }}
            >
              <Flag className="h-4 w-4 mr-2" />
              Sinalizados
            </Button>
            <Button
              variant={selectedFilter === 'completed' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => { setSelectedFilter('completed'); setSelectedList(null); }}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Concluídos
            </Button>

            {lists.length > 0 && (
              <>
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">LISTAS</p>
                </div>
                {lists.map(list => (
                  <Button
                    key={list.id}
                    variant={selectedList === list.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => { setSelectedList(list.id); setSelectedFilter('all'); }}
                  >
                    <span className="mr-2">{list.icon}</span>
                    {list.name}
                  </Button>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          {Object.entries(groupedReminders).map(([group, groupReminders]) => {
            if (groupReminders.length === 0) return null;

            const titles: Record<string, string> = {
              overdue: '⚠️ Atrasados',
              today: '📅 Hoje',
              tomorrow: '🌅 Amanhã',
              thisWeek: '📆 Esta Semana',
              later: '🔮 Mais Tarde',
              noDate: '📋 Sem Data',
            };

            return (
              <div key={group}>
                <h2 className="text-lg font-semibold mb-3">{titles[group]}</h2>
                <div className="space-y-2">
                  {groupReminders.map(reminder => (
                    <ReminderCard
                      key={reminder.id}
                      reminder={reminder}
                      onToggle={toggleReminder}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {filteredReminders.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum lembrete encontrado</p>
                <p className="text-sm mt-2">
                  {search
                    ? 'Tente ajustar sua busca'
                    : 'Crie seu primeiro lembrete para começar'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <ReminderFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        reminder={editingReminder}
      />
    </div>
  );
}
