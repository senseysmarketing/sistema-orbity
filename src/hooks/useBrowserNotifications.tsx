import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CustomNotificationOptions extends NotificationOptions {
  action_url?: string;
  silent?: boolean;
  tag?: string;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações.",
        variant: "destructive",
      });
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast({
        title: "Notificações ativadas",
        description: "Você receberá notificações dos seus lembretes!",
      });
      return true;
    } else {
      toast({
        title: "Notificações bloqueadas",
        description: "Você não receberá notificações dos seus lembretes.",
        variant: "destructive",
      });
      return false;
    }
  };

  const showNotification = (title: string, options?: CustomNotificationOptions) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      // Feedback sonoro embutido (respeita flag silent)
      if (!options?.silent) {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {}); // Previne erros de autoplay bloqueado pelo navegador
      }

      // Deep Linking: navegação dinâmica no clique
      notification.onclick = () => {
        window.focus();
        if (options?.action_url) {
          window.location.href = options.action_url;
        }
        notification.close();
      };

      // Auto-encerramento de segurança após 6s
      setTimeout(() => notification.close(), 6000);

      return notification;
    }
    return null;
  };

  return {
    permission,
    requestPermission,
    showNotification,
  };
}
