import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, CheckCheck, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./NotificationItem";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  onClose: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const { notifications, loading, markAllAsRead, enableDoNotDisturb } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread' | 'today'>('unread');

  const handleDoNotDisturb = (hours: number) => {
    enableDoNotDisturb(hours);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(n.created_at) >= today;
    }
    return true;
  });

  const groupedNotifications = {
    urgent: filteredNotifications.filter(n => n.priority === 'urgent'),
    high: filteredNotifications.filter(n => n.priority === 'high'),
    medium: filteredNotifications.filter(n => n.priority === 'medium'),
    low: filteredNotifications.filter(n => n.priority === 'low'),
  };

  return (
    <>
      <div className="flex items-center justify-between p-3 md:p-4 border-b">
        <h3 className="font-semibold text-base md:text-lg">Notificações</h3>
        <div className="flex gap-1 md:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                <Moon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDoNotDisturb(1)}>
                Não perturbe por 1 hora
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDoNotDisturb(2)}>
                Não perturbe por 2 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDoNotDisturb(4)}>
                Não perturbe por 4 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDoNotDisturb(8)}>
                Não perturbe por 8 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDoNotDisturb(24)}>
                Não perturbe por 24 horas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={markAllAsRead}
            disabled={notifications.every(n => n.is_read)}
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => {
              onClose();
              navigate('/dashboard/settings/notifications');
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="unread" className="w-full" onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="w-full rounded-none border-b h-10">
          <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm">Todas</TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 text-xs sm:text-sm">
            <span className="hidden sm:inline">Não lidas</span>
            <span className="sm:hidden">Novas</span>
          </TabsTrigger>
          <TabsTrigger value="today" className="flex-1 text-xs sm:text-sm">Hoje</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="m-0">
          <ScrollArea className="h-[60vh] md:h-[500px]">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y">
                {/* Urgent notifications */}
                {groupedNotifications.urgent.length > 0 && (
                  <div>
                    <div className="px-3 md:px-4 py-2 bg-destructive/10">
                      <p className="text-xs font-medium text-destructive">Urgente</p>
                    </div>
                    {groupedNotifications.urgent.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                )}

                {/* High priority notifications */}
                {groupedNotifications.high.length > 0 && (
                  <div>
                    <div className="px-3 md:px-4 py-2 bg-orange-500/10">
                      <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Alta prioridade</p>
                    </div>
                    {groupedNotifications.high.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                )}

                {/* Medium priority notifications */}
                {groupedNotifications.medium.length > 0 && (
                  <>
                    {(groupedNotifications.urgent.length > 0 || groupedNotifications.high.length > 0) && (
                      <Separator />
                    )}
                    {groupedNotifications.medium.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification}
                        onClose={onClose}
                      />
                    ))}
                  </>
                )}

                {/* Low priority notifications */}
                {groupedNotifications.low.length > 0 && (
                  <>
                    {filteredNotifications.length > groupedNotifications.low.length && (
                      <Separator />
                    )}
                    {groupedNotifications.low.map(notification => (
                      <NotificationItem 
                        key={notification.id} 
                        notification={notification}
                        onClose={onClose}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </>
  );
}
