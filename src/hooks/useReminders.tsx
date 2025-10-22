import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type ReminderPriority = 'none' | 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Reminder {
  id: string;
  user_id: string;
  agency_id: string | null;
  list_id: string | null;
  title: string;
  notes: string | null;
  reminder_time: string | null;
  completed: boolean;
  completed_at: string | null;
  recurrence_type: RecurrenceType;
  recurrence_interval: number | null;
  recurrence_days_of_week: number[] | null;
  recurrence_end_date: string | null;
  recurrence_count: number | null;
  parent_reminder_id: string | null;
  notification_enabled: boolean;
  notification_minutes_before: number;
  notification_sound: string;
  last_notification_sent: string | null;
  priority: ReminderPriority;
  is_flagged: boolean;
  subtasks: any;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('reminder_time', { ascending: true, nullsFirst: false });

      if (error) throw error;
      const parsedData = (data || []).map(r => ({
        ...r,
        subtasks: typeof r.subtasks === 'string' ? JSON.parse(r.subtasks) : (r.subtasks || []),
        tags: r.tags || [],
      }));
      setReminders(parsedData as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar lembretes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();

    const channel = supabase
      .channel('reminders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders'
        },
        () => fetchReminders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createReminder = async (reminder: Partial<Reminder>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const insertData = {
        title: reminder.title!,
        notes: reminder.notes,
        reminder_time: reminder.reminder_time,
        list_id: reminder.list_id,
        priority: reminder.priority || 'none',
        is_flagged: reminder.is_flagged || false,
        recurrence_type: reminder.recurrence_type || 'none',
        recurrence_interval: reminder.recurrence_interval,
        recurrence_days_of_week: reminder.recurrence_days_of_week,
        notification_enabled: reminder.notification_enabled !== undefined ? reminder.notification_enabled : true,
        notification_minutes_before: reminder.notification_minutes_before || 0,
        subtasks: reminder.subtasks || [],
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('reminders')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Atualização otimista do cache local
      if (data) {
        const newReminder = {
          ...data,
          subtasks: typeof data.subtasks === 'string' ? JSON.parse(data.subtasks) : (data.subtasks || []),
          tags: data.tags || [],
        };
        setReminders(prev => [...prev, newReminder as Reminder]);
      }

      toast({
        title: "Lembrete criado",
        description: "Novo lembrete criado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateReminder = async (id: string, updates: Partial<Reminder>) => {
    try {
      const updateData: any = { ...updates };
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.created_at;
      delete updateData.updated_at;

      const { data, error } = await supabase
        .from('reminders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualização otimista do cache local
      if (data) {
        const updatedReminder = {
          ...data,
          subtasks: typeof data.subtasks === 'string' ? JSON.parse(data.subtasks) : (data.subtasks || []),
          tags: data.tags || [],
        };
        setReminders(prev => prev.map(r => r.id === id ? updatedReminder as Reminder : r));
      }

      toast({
        title: "Lembrete atualizado",
        description: "Lembrete atualizado com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleReminder = async (id: string, completed: boolean) => {
    try {
      // Atualização otimista do cache local
      setReminders(prev => prev.map(r => 
        r.id === id 
          ? { ...r, completed, completed_at: completed ? new Date().toISOString() : null }
          : r
      ));

      const { error } = await supabase
        .from('reminders')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      if (completed) {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }
    } catch (error: any) {
      // Reverter em caso de erro
      setReminders(prev => prev.map(r => 
        r.id === id 
          ? { ...r, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
          : r
      ));
      toast({
        title: "Erro ao atualizar lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      // Backup para possível reversão
      const backup = reminders.find(r => r.id === id);
      
      // Atualização otimista do cache local
      setReminders(prev => prev.filter(r => r.id !== id));

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) {
        // Reverter em caso de erro
        if (backup) {
          setReminders(prev => [...prev, backup]);
        }
        throw error;
      }

      toast({
        title: "Lembrete removido",
        description: "Lembrete removido com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover lembrete",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    reminders,
    loading,
    createReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
    refetch: fetchReminders,
  };
}
