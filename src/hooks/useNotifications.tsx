import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAgency } from '@/hooks/useAgency';
import { useAuth } from '@/hooks/useAuth';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

export type NotificationType = 'reminder' | 'task' | 'post' | 'payment' | 'expense' | 'lead' | 'meeting' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  user_id: string;
  agency_id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  is_read: boolean;
  is_archived: boolean;
  scheduled_for?: string;
  created_at: string;
  read_at?: string;
  entity_type?: string;
  entity_id?: string;
  action_type?: string;
  group_count?: number;
  last_aggregated_at?: string | null;
}

interface NotificationContextType {
  notifications: Notification[];
  loading: boolean;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  enableDoNotDisturb: (hours: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const _browserNotifications = useBrowserNotifications();

  const fetchNotifications = useCallback(async () => {
    if (!currentAgency?.id) return;
    
    try {
      setLoading(true);
      // GUARDRAIL #1: ordenação por COALESCE(last_aggregated_at, created_at) DESC
      // Emulado com dois .order() — o último_aggregated_at vence quando não-nulo.
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_archived', false)
        .order('last_aggregated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data || []) as Notification[]);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id, toast]);

  const markAsRead = useCallback(async (id: string) => {
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    const notification = notifications.find(n => n.id === id);
    
    if (!notification || notification.is_read) return;

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      console.error('Error marking notification as read:', error);
      toast({
        title: "Erro ao marcar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [notifications, unreadCount, toast]);

  const markAllAsRead = useCallback(async () => {
    if (!currentAgency?.id) return;
    
    const prevNotifications = notifications;
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('agency_id', currentAgency.id)
      .eq('is_read', false);

    if (error) {
      setNotifications(prevNotifications);
      setUnreadCount(prevNotifications.filter(n => !n.is_read).length);
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro ao marcar notificações",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Notificações marcadas como lidas" });
    }
  }, [currentAgency?.id, notifications, toast]);

  const archiveNotification = useCallback(async (id: string) => {
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    const notification = notifications.find(n => n.id === id);

    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      console.error('Error archiving notification:', error);
      toast({
        title: "Erro ao arquivar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [notifications, unreadCount, toast]);

  const deleteNotification = useCallback(async (id: string) => {
    const prevNotifications = notifications;
    const prevUnread = unreadCount;
    const notification = notifications.find(n => n.id === id);

    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      setNotifications(prevNotifications);
      setUnreadCount(prevUnread);
      console.error('Error deleting notification:', error);
      toast({
        title: "Erro ao deletar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [notifications, unreadCount, toast]);

  // Single WebSocket channel + fetch
  useEffect(() => {
    if (!currentAgency?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `agency_id=eq.${currentAgency.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAgency?.id, fetchNotifications]);

  const enableDoNotDisturb = useCallback(async (hours: number) => {
    if (!user || !currentAgency?.id) return;

    try {
      const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          agency_id: currentAgency.id,
          do_not_disturb_until: endTime.toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Não perturbe ativado",
        description: `Você não receberá notificações pelos próximos ${hours} hora(s).`,
      });
    } catch (error) {
      console.error('Error enabling do not disturb:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar o modo não perturbe.",
        variant: "destructive",
      });
    }
  }, [user, currentAgency?.id, toast]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      loading,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      archiveNotification,
      deleteNotification,
      enableDoNotDisturb,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
