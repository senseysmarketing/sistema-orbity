import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { Bell, Mail, Volume2, Chrome, Clock, Smartphone, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PushDiagnostics } from "./PushDiagnostics";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationTypes {
  reminders_enabled: boolean;
  tasks_enabled: boolean;
  posts_enabled: boolean;
  payments_enabled: boolean;
  expenses_enabled: boolean;
  leads_enabled: boolean;
  meetings_enabled: boolean;
  system_enabled: boolean;
}

interface Channels {
  sound_enabled: boolean;
  browser_notifications: boolean;
  email_enabled: boolean;
  email_address: string;
  email_digest: boolean;
}

interface DoNotDisturb {
  dnd_start_time: string;
  dnd_end_time: string;
  dnd_weekends: boolean;
}

// Push Notification Section Component
function PushNotificationSection() {
  const { 
    permission, 
    isSupported, 
    isLoading, 
    hasFirebaseConfig,
    requestPermission,
    disablePushNotifications,
    token,
    isStandaloneMode,
    isIOS,
  } = usePushNotifications();

  if (!hasFirebaseConfig) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between opacity-60">
          <Label className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4" />
            <span>Push no Celular</span>
          </Label>
          <span className="text-xs text-muted-foreground">Não configurado</span>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Configuração do Firebase necessária para notificações push.
        </p>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between opacity-60">
          <Label className="flex items-center gap-2 text-sm">
            <Smartphone className="h-4 w-4" />
            <span>Push no Celular</span>
          </Label>
          <span className="text-xs text-muted-foreground">Não suportado</span>
        </div>
        <p className="text-xs text-muted-foreground ml-6">
          Seu navegador não suporta notificações push. Tente usar o app instalado.
        </p>
      </div>
    );
  }

  const isEnabled = permission === 'granted' && token;
  const showIOSWarning = isIOS && !isStandaloneMode;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 cursor-pointer text-sm">
          <Smartphone className="h-4 w-4" />
          <span>Push no Celular</span>
        </Label>
        {isEnabled ? (
          <Button
            variant="outline"
            size="sm"
            onClick={disablePushNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Desativar'
            )}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={requestPermission}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isLoading ? 'Ativando...' : 'Ativar'}
          </Button>
        )}
      </div>
      
      {/* iOS Safari warning - Critical for push to work */}
      {showIOSWarning && (
        <div className="ml-6 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            ⚠️ Para receber notificações no iPhone:
          </p>
          <ol className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1 ml-4 list-decimal">
            <li>Toque em <strong>Compartilhar</strong> (ícone ↑) no Safari</li>
            <li>Selecione <strong>"Adicionar à Tela de Início"</strong></li>
            <li>Abra o app pelo <strong>ícone na tela inicial</strong></li>
            <li>Então ative as notificações aqui</li>
          </ol>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground ml-6">
        {isEnabled 
          ? `✓ Notificações push ativadas${isStandaloneMode ? ' (PWA)' : ''}. Você receberá alertas mesmo com o app em segundo plano.`
          : 'Receba alertas no celular mesmo com o app fechado. Ideal para o PWA instalado.'}
      </p>
      {permission === 'denied' && (
        <p className="text-xs text-destructive ml-6">
          Permissão negada. Ative nas configurações do navegador para usar este recurso.
        </p>
      )}
      
      {/* Diagnostics Panel - Always visible when push is enabled */}
      {isEnabled && (
        <PushDiagnostics
          token={token}
          permission={permission}
          isStandaloneMode={isStandaloneMode}
          isIOS={isIOS}
          isSupported={isSupported}
        />
      )}
    </div>
  );
}

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  const { user } = useAuth();
  const { currentAgency, isAgencyAdmin } = useAgency();
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const TASK_EVENT_KEYS = {
    assigned: 'task.assigned',
    statusChanged: 'task.status_changed',
    importantUpdated: 'task.updated_important',
    commentAdded: 'task.comment_added',
  } as const;

  const POST_EVENT_KEYS = {
    assigned: 'post.assigned',
    statusChanged: 'post.status_changed',
    importantUpdated: 'post.updated_important',
    pendingApproval: 'post.pending_approval',
  } as const;

  type TaskEventKey = (typeof TASK_EVENT_KEYS)[keyof typeof TASK_EVENT_KEYS];
  type PostEventKey = (typeof POST_EVENT_KEYS)[keyof typeof POST_EVENT_KEYS];
  
  const [types, setTypes] = useState<NotificationTypes>({
    reminders_enabled: true,
    tasks_enabled: true,
    posts_enabled: true,
    payments_enabled: true,
    expenses_enabled: true,
    leads_enabled: true,
    meetings_enabled: true,
    system_enabled: true,
  });

  const [channels, setChannels] = useState<Channels>({
    sound_enabled: true,
    browser_notifications: false,
    email_enabled: false,
    email_address: "",
    email_digest: false,
  });

  const [dnd, setDnd] = useState<DoNotDisturb>({
    dnd_start_time: "22:00",
    dnd_end_time: "08:00",
    dnd_weekends: false,
  });

  const [dndEnabled, setDndEnabled] = useState(false);

  const [taskEvents, setTaskEvents] = useState<Record<TaskEventKey, boolean>>({
    [TASK_EVENT_KEYS.assigned]: true,
    [TASK_EVENT_KEYS.statusChanged]: true,
    [TASK_EVENT_KEYS.importantUpdated]: true,
    [TASK_EVENT_KEYS.commentAdded]: true,
  });

  const [postEvents, setPostEvents] = useState<Record<PostEventKey, boolean>>({
    [POST_EVENT_KEYS.assigned]: true,
    [POST_EVENT_KEYS.statusChanged]: true,
    [POST_EVENT_KEYS.importantUpdated]: true,
    [POST_EVENT_KEYS.pendingApproval]: true,
  });

  const [agencyTaskRules, setAgencyTaskRules] = useState({
    notifyAdminsOnDone: false,
    notifyCreatorOnAssigned: false,
  });

  const [agencyPostRules, setAgencyPostRules] = useState({
    notifyAdminsOnPublished: false,
  });

  useEffect(() => {
    if (open && user && currentAgency) {
      fetchPreferences();
    }
  }, [open, user, currentAgency]);

  const fetchPreferences = async () => {
    if (!user || !currentAgency?.id) return;

    try {
      setLoading(true);

      // Fetch notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("agency_id", currentAgency.id)
        .single();

      if (prefs) {
        setTypes({
          reminders_enabled: prefs.reminders_enabled,
          tasks_enabled: prefs.tasks_enabled,
          posts_enabled: prefs.posts_enabled,
          payments_enabled: prefs.payments_enabled,
          expenses_enabled: prefs.expenses_enabled,
          leads_enabled: prefs.leads_enabled,
          meetings_enabled: prefs.meetings_enabled,
          system_enabled: prefs.system_enabled,
        });

        setChannels(prev => ({
          ...prev,
          sound_enabled: prefs.sound_enabled ?? true,
          browser_notifications: prefs.browser_notifications ?? false,
        }));

        setDnd({
          dnd_start_time: prefs.dnd_start_time || "22:00",
          dnd_end_time: prefs.dnd_end_time || "08:00",
          dnd_weekends: prefs.dnd_weekends ?? false,
        });

        setDndEnabled(!!(prefs.dnd_start_time || prefs.dnd_end_time));
      }

      // Fetch email channel config  
      const { data: emailData } = await supabase
        .from("user_notification_channels")
        .select("email_enabled, email_address, email_digest")
        .eq("user_id", user.id)
        .eq("agency_id", currentAgency.id)
        .maybeSingle();

      if (emailData) {
        setChannels(prev => ({
          ...prev,
          email_enabled: emailData.email_enabled ?? false,
          email_address: emailData.email_address || user.email || "",
          email_digest: emailData.email_digest ?? false,
        }));
      } else {
        setChannels(prev => ({
          ...prev,
          email_address: user.email || "",
        }));
      }

      // Fetch per-event task preferences
      const eventKeys = Object.values(TASK_EVENT_KEYS);
      const { data: eventPrefs, error: eventPrefsError } = await supabase
        .from('notification_event_preferences')
        .select('event_key, enabled')
        .eq('user_id', user.id)
        .eq('agency_id', currentAgency.id)
        .in('event_key', eventKeys);

      if (eventPrefsError) throw eventPrefsError;

      if (eventPrefs) {
        setTaskEvents(prev => {
          const next = { ...prev };
          for (const row of eventPrefs) {
            const key = row.event_key as TaskEventKey;
            if (key in next) next[key] = !!row.enabled;
          }
          return next;
        });
      }

      // Fetch per-event post preferences
      const postEventKeys = Object.values(POST_EVENT_KEYS);
      const { data: postEventPrefs, error: postEventPrefsError } = await supabase
        .from('notification_event_preferences')
        .select('event_key, enabled')
        .eq('user_id', user.id)
        .eq('agency_id', currentAgency.id)
        .in('event_key', postEventKeys);

      if (postEventPrefsError) throw postEventPrefsError;

      if (postEventPrefs) {
        setPostEvents(prev => {
          const next = { ...prev };
          for (const row of postEventPrefs) {
            const key = row.event_key as PostEventKey;
            if (key in next) next[key] = !!row.enabled;
          }
          return next;
        });
      }

      // Fetch agency rules (admin-only)
      if (isAgencyAdmin()) {
        const { data: rules, error: rulesError } = await supabase
          .from('agency_notification_rules')
          .select('event_key, recipients_strategy, enabled, conditions')
          .eq('agency_id', currentAgency.id)
          .in('event_key', [TASK_EVENT_KEYS.assigned, TASK_EVENT_KEYS.statusChanged, 'post.published']);

        if (rulesError) throw rulesError;

        const notifyCreatorOnAssigned =
          !!rules?.find(r => r.event_key === TASK_EVENT_KEYS.assigned && r.recipients_strategy === 'creator')
            ?.enabled;

        const notifyAdminsOnDone =
          !!rules?.find(r =>
            r.event_key === TASK_EVENT_KEYS.statusChanged &&
            r.recipients_strategy === 'admins' &&
            (r.conditions as any)?.to === 'done'
          )?.enabled;

        const notifyAdminsOnPublished =
          !!rules?.find(r =>
            r.event_key === 'post.published' &&
            r.recipients_strategy === 'admins' &&
            (r.conditions as any)?.to === 'published'
          )?.enabled;

        setAgencyTaskRules({ notifyAdminsOnDone, notifyCreatorOnAssigned });
        setAgencyPostRules({ notifyAdminsOnPublished });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const requestBrowserPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setChannels(prev => ({ ...prev, browser_notifications: true }));
        toast.success("Permissão concedida para notificações do navegador");
      } else {
        toast.error("Permissão negada para notificações do navegador");
      }
    }
  };

  const handleSave = async () => {
    if (!user || !currentAgency?.id) return;

    try {
      setLoading(true);

      // Save notification preferences
      const prefsToSave = {
        user_id: user.id,
        agency_id: currentAgency.id,
        ...types,
        sound_enabled: channels.sound_enabled,
        browser_notifications: channels.browser_notifications,
        dnd_start_time: dndEnabled ? dnd.dnd_start_time : null,
        dnd_end_time: dndEnabled ? dnd.dnd_end_time : null,
        dnd_weekends: dndEnabled ? dnd.dnd_weekends : false,
      };

      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .upsert(prefsToSave, { onConflict: 'user_id' });

      if (prefsError) throw prefsError;

      // Save email channel config
      const emailConfigToSave = {
        user_id: user.id,
        agency_id: currentAgency.id,
        email_enabled: channels.email_enabled,
        email_address: channels.email_address,
        email_digest: channels.email_digest,
      };

      const { error: emailError } = await supabase
        .from("user_notification_channels")
        .upsert(emailConfigToSave, { onConflict: 'user_id,agency_id' });

      if (emailError) throw emailError;

      // Save per-event preferences for tasks
      const eventPrefsToSave = (Object.values(TASK_EVENT_KEYS) as TaskEventKey[]).map((eventKey) => ({
        user_id: user.id,
        agency_id: currentAgency.id,
        event_key: eventKey,
        enabled: !!taskEvents[eventKey],
      }));

      // Save per-event preferences for posts
      const postEventPrefsToSave = (Object.values(POST_EVENT_KEYS) as PostEventKey[]).map((eventKey) => ({
        user_id: user.id,
        agency_id: currentAgency.id,
        event_key: eventKey,
        enabled: !!postEvents[eventKey],
      }));

      const { error: eventPrefsSaveError } = await supabase
        .from('notification_event_preferences')
        .upsert([...eventPrefsToSave, ...postEventPrefsToSave], { onConflict: 'user_id,agency_id,event_key' });

      if (eventPrefsSaveError) throw eventPrefsSaveError;

      // Save agency rules (admin-only)
      if (isAgencyAdmin()) {
        const rulesToUpsert: any[] = [
          {
            agency_id: currentAgency.id,
            event_key: TASK_EVENT_KEYS.assigned,
            recipients_strategy: 'creator',
            enabled: agencyTaskRules.notifyCreatorOnAssigned,
            conditions: null,
            created_by: user.id,
          },
          {
            agency_id: currentAgency.id,
            event_key: TASK_EVENT_KEYS.statusChanged,
            recipients_strategy: 'admins',
            enabled: agencyTaskRules.notifyAdminsOnDone,
            conditions: { to: 'done' },
            created_by: user.id,
          },
          {
            agency_id: currentAgency.id,
            event_key: 'post.published',
            recipients_strategy: 'admins',
            enabled: agencyPostRules.notifyAdminsOnPublished,
            conditions: { to: 'published' },
            created_by: user.id,
          },
        ];

        const { error: rulesError } = await supabase
          .from('agency_notification_rules')
          .upsert(rulesToUpsert, { onConflict: 'agency_id,event_key,recipients_strategy' });

        if (rulesError) throw rulesError;
      }

      toast.success("Preferências de notificação salvas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
  };

  const notificationTypesList = [
    { key: "reminders_enabled", label: "Lembretes", icon: "📝" },
    { key: "tasks_enabled", label: "Tarefas", icon: "✅" },
    { key: "posts_enabled", label: "Posts de Social Media", labelMobile: "Posts", icon: "📱" },
    { key: "payments_enabled", label: "Pagamentos de Clientes", labelMobile: "Pagamentos", icon: "💰" },
    { key: "expenses_enabled", label: "Despesas", icon: "💸" },
    { key: "leads_enabled", label: "Leads", icon: "👤" },
    { key: "meetings_enabled", label: "Reuniões", icon: "📅" },
    { key: "system_enabled", label: "Notificações do Sistema", labelMobile: "Sistema", icon: "🔔" },
  ];

  const content = (
    <div className="space-y-4 md:space-y-6">
      {/* Seção 1: O que notificar */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            O que notificar
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Escolha os tipos de notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
          {notificationTypesList.map(({ key, label, labelMobile, icon }) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer text-sm">
                <span className="text-lg md:text-xl">{icon}</span>
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{labelMobile || label}</span>
              </Label>
              <Switch
                id={key}
                checked={types[key as keyof NotificationTypes]}
                onCheckedChange={(checked) =>
                  setTypes(prev => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Seção 1.5: Tarefas por evento */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <span className="text-lg">✅</span>
            <span className="hidden md:inline">Tarefas (por evento)</span>
            <span className="md:hidden">Tarefas</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            <span className="hidden sm:inline">Personalize quais eventos de tarefas disparam notificações.</span>
            <span className="sm:hidden">Eventos de tarefas</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando uma tarefa for atribuída a mim</span>
              <span className="md:hidden">Tarefa atribuída</span>
            </Label>
            <Switch
              checked={taskEvents[TASK_EVENT_KEYS.assigned]}
              disabled={!types.tasks_enabled}
              onCheckedChange={(checked) =>
                setTaskEvents(prev => ({ ...prev, [TASK_EVENT_KEYS.assigned]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando o status da tarefa mudar</span>
              <span className="md:hidden">Status alterado</span>
            </Label>
            <Switch
              checked={taskEvents[TASK_EVENT_KEYS.statusChanged]}
              disabled={!types.tasks_enabled}
              onCheckedChange={(checked) =>
                setTaskEvents(prev => ({ ...prev, [TASK_EVENT_KEYS.statusChanged]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando houver mudanças importantes (prazo/prioridade/título)</span>
              <span className="md:hidden">Mudanças importantes</span>
            </Label>
            <Switch
              checked={taskEvents[TASK_EVENT_KEYS.importantUpdated]}
              disabled={!types.tasks_enabled}
              onCheckedChange={(checked) =>
                setTaskEvents(prev => ({ ...prev, [TASK_EVENT_KEYS.importantUpdated]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between opacity-70">
            <div className="flex-1 min-w-0 mr-3">
              <Label className="cursor-pointer text-sm">
                <span className="hidden md:inline">Quando alguém comentar/adicionar nota</span>
                <span className="md:hidden">Comentário/nota</span>
              </Label>
              <p className="text-xs text-muted-foreground hidden sm:block">Em breve</p>
            </div>
            <Switch checked={taskEvents[TASK_EVENT_KEYS.commentAdded]} disabled className="flex-shrink-0" />
          </div>

          {!types.tasks_enabled && (
            <p className="text-xs text-muted-foreground">
              Ative <strong>Tarefas</strong> acima para habilitar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Seção 1.55: Posts por evento */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <span className="text-lg">📱</span>
            <span className="hidden md:inline">Posts (por evento)</span>
            <span className="md:hidden">Posts</span>
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            <span className="hidden sm:inline">Personalize quais eventos de posts disparam notificações.</span>
            <span className="sm:hidden">Eventos de posts</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando um post for atribuído a mim</span>
              <span className="md:hidden">Post atribuído</span>
            </Label>
            <Switch
              checked={postEvents[POST_EVENT_KEYS.assigned]}
              disabled={!types.posts_enabled}
              onCheckedChange={(checked) =>
                setPostEvents(prev => ({ ...prev, [POST_EVENT_KEYS.assigned]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando o status do post mudar</span>
              <span className="md:hidden">Status alterado</span>
            </Label>
            <Switch
              checked={postEvents[POST_EVENT_KEYS.statusChanged]}
              disabled={!types.posts_enabled}
              onCheckedChange={(checked) =>
                setPostEvents(prev => ({ ...prev, [POST_EVENT_KEYS.statusChanged]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando houver mudanças importantes (data/prioridade/título/notas)</span>
              <span className="md:hidden">Mudanças importantes</span>
            </Label>
            <Switch
              checked={postEvents[POST_EVENT_KEYS.importantUpdated]}
              disabled={!types.posts_enabled}
              onCheckedChange={(checked) =>
                setPostEvents(prev => ({ ...prev, [POST_EVENT_KEYS.importantUpdated]: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="cursor-pointer text-sm">
              <span className="hidden md:inline">Quando um post entrar em "Aguardando Aprovação"</span>
              <span className="md:hidden">Aguardando aprovação</span>
            </Label>
            <Switch
              checked={postEvents[POST_EVENT_KEYS.pendingApproval]}
              disabled={!types.posts_enabled}
              onCheckedChange={(checked) =>
                setPostEvents(prev => ({ ...prev, [POST_EVENT_KEYS.pendingApproval]: checked }))
              }
            />
          </div>

          {!types.posts_enabled && (
            <p className="text-xs text-muted-foreground">
              Ative <strong>Posts</strong> acima para habilitar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Seção 1.6: Regras do time (Admins) */}
      {isAgencyAdmin() && (
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              🏢 <span className="hidden md:inline">Regras do time (Admins)</span>
              <span className="md:hidden">Regras do time</span>
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Regras automáticas para a agência
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <Label className="cursor-pointer text-sm">
                  <span className="hidden md:inline">Notificar admins quando tarefa virar Concluída</span>
                  <span className="md:hidden">Admins: tarefa concluída</span>
                </Label>
                <p className="text-xs text-muted-foreground hidden sm:block">Evento: status → done</p>
              </div>
              <Switch
                checked={agencyTaskRules.notifyAdminsOnDone}
                onCheckedChange={(checked) =>
                  setAgencyTaskRules(prev => ({ ...prev, notifyAdminsOnDone: checked }))
                }
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <Label className="cursor-pointer text-sm">
                  <span className="hidden md:inline">Notificar criador quando a tarefa for atribuída</span>
                  <span className="md:hidden">Criador: tarefa atribuída</span>
                </Label>
                <p className="text-xs text-muted-foreground hidden sm:block">Útil para delegações</p>
              </div>
              <Switch
                checked={agencyTaskRules.notifyCreatorOnAssigned}
                onCheckedChange={(checked) =>
                  setAgencyTaskRules(prev => ({ ...prev, notifyCreatorOnAssigned: checked }))
                }
                className="flex-shrink-0"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 mr-3">
                <Label className="cursor-pointer text-sm">
                  <span className="hidden md:inline">Notificar admins quando um post for publicado</span>
                  <span className="md:hidden">Admins: post publicado</span>
                </Label>
                <p className="text-xs text-muted-foreground hidden sm:block">Evento: status → published</p>
              </div>
              <Switch
                checked={agencyPostRules.notifyAdminsOnPublished}
                onCheckedChange={(checked) =>
                  setAgencyPostRules({ notifyAdminsOnPublished: checked })
                }
                className="flex-shrink-0"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção 2: Onde receber */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Mail className="h-4 w-4 md:h-5 md:w-5" />
            Onde receber
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Canais de entrega das notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6">
          {/* Sistema */}
          <div className="flex items-center justify-between opacity-60">
            <Label className="flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">Notificações no Sistema</span>
              <span className="md:hidden">Sistema</span>
            </Label>
            <span className="text-xs text-muted-foreground">Sempre ativo</span>
          </div>

          <Separator />

          {/* Som */}
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="flex items-center gap-2 cursor-pointer text-sm">
              <Volume2 className="h-4 w-4" />
              <span className="hidden md:inline">Som de Notificação</span>
              <span className="md:hidden">Som</span>
            </Label>
            <Switch
              id="sound"
              checked={channels.sound_enabled}
              onCheckedChange={(checked) =>
                setChannels(prev => ({ ...prev, sound_enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* Navegador */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="browser" className="flex items-center gap-2 cursor-pointer text-sm">
                <Chrome className="h-4 w-4" />
                <span className="hidden md:inline">Notificações do Navegador</span>
                <span className="md:hidden">Navegador</span>
              </Label>
              <Switch
                id="browser"
                checked={channels.browser_notifications}
                onCheckedChange={(checked) => {
                  if (checked && Notification.permission !== "granted") {
                    requestBrowserPermission();
                  } else {
                    setChannels(prev => ({ ...prev, browser_notifications: checked }));
                  }
                }}
              />
            </div>
            {channels.browser_notifications && Notification.permission !== "granted" && (
              <p className="text-xs text-muted-foreground ml-6">
                Clique no switch para solicitar permissão
              </p>
            )}
          </div>

          <Separator />

          {/* Push Notifications (Celular) */}
          <PushNotificationSection />

          <Separator />

          {/* Email */}
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer text-sm">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </Label>
              <Switch
                id="email"
                checked={channels.email_enabled}
                onCheckedChange={(checked) =>
                  setChannels(prev => ({ ...prev, email_enabled: checked }))
                }
              />
            </div>

            {channels.email_enabled && (
              <div className="ml-4 md:ml-6 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email-address" className="text-xs md:text-sm">
                    Endereço de Email
                  </Label>
                  <Input
                    id="email-address"
                    type="email"
                    placeholder="seu@email.com"
                    value={channels.email_address}
                    onChange={(e) =>
                      setChannels(prev => ({ ...prev, email_address: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="digest"
                    checked={channels.email_digest}
                    onCheckedChange={(checked) =>
                      setChannels(prev => ({ ...prev, email_digest: checked as boolean }))
                    }
                  />
                  <Label htmlFor="digest" className="text-xs md:text-sm cursor-pointer">
                    <span className="hidden md:inline">Receber resumo diário (uma vez por dia)</span>
                    <span className="md:hidden">Resumo diário</span>
                  </Label>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Não Perturbe */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Clock className="h-4 w-4 md:h-5 md:w-5" />
            Não Perturbe
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            <span className="hidden sm:inline">Configure quando você não deseja receber notificações</span>
            <span className="sm:hidden">Horários de silêncio</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dnd-enabled" className="cursor-pointer text-sm">
              Ativar Não Perturbe
            </Label>
            <Switch
              id="dnd-enabled"
              checked={dndEnabled}
              onCheckedChange={setDndEnabled}
            />
          </div>

          {dndEnabled && (
            <div className="ml-4 md:ml-6 space-y-3 md:space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dnd-start" className="text-xs md:text-sm">
                    De
                  </Label>
                  <Input
                    id="dnd-start"
                    type="time"
                    value={dnd.dnd_start_time}
                    onChange={(e) =>
                      setDnd(prev => ({ ...prev, dnd_start_time: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dnd-end" className="text-xs md:text-sm">
                    Até
                  </Label>
                  <Input
                    id="dnd-end"
                    type="time"
                    value={dnd.dnd_end_time}
                    onChange={(e) =>
                      setDnd(prev => ({ ...prev, dnd_end_time: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dnd-weekends"
                  checked={dnd.dnd_weekends}
                  onCheckedChange={(checked) =>
                    setDnd(prev => ({ ...prev, dnd_weekends: checked as boolean }))
                  }
                />
                <Label htmlFor="dnd-weekends" className="text-xs md:text-sm cursor-pointer">
                  <span className="hidden md:inline">Silenciar também nos fins de semana</span>
                  <span className="md:hidden">Fins de semana</span>
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const footer = (
    <div className="flex justify-end gap-2 md:gap-3">
      <Button 
        variant="outline" 
        onClick={() => onOpenChange(false)} 
        disabled={loading}
        size="sm"
        className="md:h-10 md:px-4 md:py-2"
      >
        Cancelar
      </Button>
      <Button 
        onClick={handleSave} 
        disabled={loading}
        size="sm"
        className="md:h-10 md:px-4 md:py-2"
      >
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Preferências de Notificação</DrawerTitle>
            <DrawerDescription>
              Configure como e quando receber notificações
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-4">
            {content}
          </div>
          <DrawerFooter className="border-t pt-4">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
          <DialogDescription>
            Configure como e quando você deseja receber notificações
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {content}
        </div>
        <div className="pt-4 border-t">
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}
