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
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, type Notification, type NotificationType } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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

const colorMap: Record<NotificationType, string> = {
  reminder: "text-blue-500",
  task: "text-green-500",
  post: "text-purple-500",
  payment: "text-orange-500",
  expense: "text-red-500",
  lead: "text-cyan-500",
  meeting: "text-indigo-500",
  system: "text-gray-500",
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markAsRead, archiveNotification } = useNotifications();
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] || Bell;

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

  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className={cn("mt-1", colorMap[notification.type])}>
          <Icon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-tight">{notification.title}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleArchive}
              type="button"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Arquivar</span>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
            
            {notification.action_label && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-primary">
                  {notification.action_label}
                  <ExternalLink className="h-3 w-3" />
                </span>
              </>
            )}
          </div>
        </div>
        
        {!notification.is_read && (
          <div className="mt-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
