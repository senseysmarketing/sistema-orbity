import { useState, useEffect } from 'react';
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
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const { showNotification } = useBrowserNotifications();

  const fetchNotifications = async (filter?: 'all' | 'unread' | 'today') => {
    if (!currentAgency?.id) return;
    
    try {
      setLoading(true);
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
      
      // Update unread count
      const unread = (data || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
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
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Erro ao marcar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    if (!currentAgency?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('agency_id', currentAgency.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);

      toast({
        title: "Notificações marcadas como lidas",
      });
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Erro ao marcar notificações",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Error archiving notification:', error);
      toast({
        title: "Erro ao arquivar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      
      const notification = notifications.find(n => n.id === id);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Erro ao deletar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!currentAgency?.id) return;

    fetchNotifications();

    // Subscribe to realtime updates - apenas para atualizar a UI
    // Push notifications são enviadas pelo trigger do banco via FCM
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `agency_id=eq.${currentAgency?.id}`,
        },
        (payload) => {
          console.log('Notification change:', payload);
          // Push notification já foi enviada pelo trigger do banco via FCM
          // Aqui apenas atualizamos a lista de notificações na UI
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAgency?.id]);

  const enableDoNotDisturb = async (hours: number) => {
    if (!user || !currentAgency?.id) return;

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          agency_id: currentAgency?.id,
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
  };

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    enableDoNotDisturb,
  };
}
