import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Bell, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Users,
  FileText,
  AlertCircle,
  X,
  ExternalLink,
  Video,
  Eye,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap: Record<NotificationType, any> = {
  reminder: Bell,
  task: CheckCircle2,
  post: FileText,
  payment: DollarSign,
  expense: TrendingUp,
  lead: Users,
  meeting: Calendar,
  system: AlertCircle,
};

const borderColorMap: Record<NotificationType, string> = {
  reminder: "border-l-blue-500",
  task: "border-l-green-500",
  post: "border-l-purple-500",
  payment: "border-l-orange-500",
  expense: "border-l-red-500",
  lead: "border-l-cyan-500",
  meeting: "border-l-indigo-500",
  system: "border-l-muted-foreground",
};

const iconColorMap: Record<NotificationType, string> = {
  reminder: "text-blue-500",
  task: "text-green-500",
  post: "text-purple-500",
  payment: "text-orange-500",
  expense: "text-red-500",
  lead: "text-cyan-500",
  meeting: "text-indigo-500",
  system: "text-muted-foreground",
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markAsRead, archiveNotification } = useNotifications();
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] || Bell;

  const meetingLink = notification.metadata?.meeting_link;

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await archiveNotification(notification.id);
  };

  const handleJoinCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (meetingLink) {
      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      window.open(meetingLink, '_blank');
    }
  };

  const handleViewTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    navigate('/tasks');
    onClose();
  };

  return (
    <div
      className={cn(
        "p-3 md:p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group border-l-3",
        borderColorMap[notification.type],
        !notification.is_read ? "bg-primary/5" : "opacity-75"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-2 md:gap-3">
        <div className={cn("mt-0.5 md:mt-1 shrink-0", iconColorMap[notification.type])}>
          <Icon className="h-4 w-4 md:h-5 md:w-5" />
        </div>
        
        <div className="flex-1 space-y-1 md:space-y-1.5 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!notification.is_read && (
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}
              <p className={cn(
                "text-xs md:text-sm leading-tight line-clamp-1",
                !notification.is_read ? "font-semibold" : "font-medium"
              )}>
                {notification.title}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 md:h-6 md:w-6 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleArchive}
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Arquivar</span>
            </Button>
          </div>
          
          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          {/* Rich Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {notification.type === 'meeting' && meetingLink && (
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleJoinCall}
              >
                <Video className="h-3 w-3" />
                Entrar na Call
              </Button>
            )}

            {notification.type === 'task' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleViewTask}
              >
                <Eye className="h-3 w-3" />
                Ver Tarefa
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            
            {notification.action_label && notification.type !== 'task' && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  <span className="hidden sm:inline">{notification.action_label}</span>
                  <span className="sm:hidden">Ver</span>
                  <ExternalLink className="h-3 w-3" />
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
