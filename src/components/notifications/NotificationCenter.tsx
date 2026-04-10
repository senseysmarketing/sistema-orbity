import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, CheckCheck, Moon, Filter } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NotificationItem } from "./NotificationItem";
import { useNotifications, type NotificationType } from "@/hooks/useNotifications";

interface NotificationCenterProps {
  onClose: () => void;
}

type TabFilter = 'all' | 'meetings' | 'tasks' | 'alerts';

const TAB_TYPE_MAP: Record<TabFilter, NotificationType[] | null> = {
  all: null,
  meetings: ['meeting'],
  tasks: ['task'],
  alerts: ['payment', 'expense', 'system', 'reminder', 'lead'],
};

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const { notifications, loading, markAllAsRead, enableDoNotDisturb } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);

  const filteredNotifications = notifications.filter(n => {
    const typeFilter = TAB_TYPE_MAP[activeTab];
    if (typeFilter && !typeFilter.includes(n.type)) return false;
    if (onlyUnread && n.is_read) return false;
    return true;
  });

  const groupedNotifications = {
    urgent: filteredNotifications.filter(n => n.priority === 'urgent'),
    high: filteredNotifications.filter(n => n.priority === 'high'),
    medium: filteredNotifications.filter(n => n.priority === 'medium'),
    low: filteredNotifications.filter(n => n.priority === 'low'),
  };

  const getTabCount = (tab: TabFilter) => {
    const types = TAB_TYPE_MAP[tab];
    if (!types) return notifications.filter(n => !n.is_read).length;
    return notifications.filter(n => types.includes(n.type) && !n.is_read).length;
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
              <DropdownMenuItem onClick={() => enableDoNotDisturb(1)}>
                Não perturbe por 1 hora
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => enableDoNotDisturb(2)}>
                Não perturbe por 2 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => enableDoNotDisturb(4)}>
                Não perturbe por 4 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => enableDoNotDisturb(8)}>
                Não perturbe por 8 horas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => enableDoNotDisturb(24)}>
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

      <Tabs defaultValue="all" className="w-full" onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList className="w-full rounded-none border-b h-10">
          <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm gap-1">
            Todas
            {getTabCount('all') > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {getTabCount('all')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex-1 text-xs sm:text-sm gap-1">
            Reuniões
            {getTabCount('meetings') > 0 && (
              <span className="bg-indigo-500 text-white rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {getTabCount('meetings')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-xs sm:text-sm gap-1">
            Tarefas
            {getTabCount('tasks') > 0 && (
              <span className="bg-green-500 text-white rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {getTabCount('tasks')}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1 text-xs sm:text-sm gap-1">
            Alertas
            {getTabCount('alerts') > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full text-[10px] px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {getTabCount('alerts')}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center justify-end gap-2 px-3 py-2 border-b">
          <Label htmlFor="unread-toggle" className="text-xs text-muted-foreground cursor-pointer">
            Só não lidas
          </Label>
          <Switch
            id="unread-toggle"
            checked={onlyUnread}
            onCheckedChange={setOnlyUnread}
            className="scale-75"
          />
        </div>

        <TabsContent value={activeTab} className="m-0">
          <ScrollArea className="h-[55vh] md:h-[460px]">
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
