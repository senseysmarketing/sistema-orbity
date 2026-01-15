import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import { Bell, Mail, Volume2, Chrome, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  
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
    { key: "posts_enabled", label: "Posts de Social Media", icon: "📱" },
    { key: "payments_enabled", label: "Pagamentos de Clientes", icon: "💰" },
    { key: "expenses_enabled", label: "Despesas", icon: "💸" },
    { key: "leads_enabled", label: "Leads", icon: "👤" },
    { key: "meetings_enabled", label: "Reuniões", icon: "📅" },
    { key: "system_enabled", label: "Notificações do Sistema", icon: "🔔" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
          <DialogDescription>
            Configure como e quando você deseja receber notificações
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seção 1: O que notificar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                O que notificar
              </CardTitle>
              <CardDescription>
                Escolha os tipos de notificações que deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationTypesList.map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xl">{icon}</span>
                    <span>{label}</span>
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

          {/* Seção 2: Onde receber */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5" />
                Onde receber
              </CardTitle>
              <CardDescription>
                Configure os canais de entrega das notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sistema */}
              <div className="flex items-center justify-between opacity-60">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Notificações no Sistema</span>
                </Label>
                <span className="text-sm text-muted-foreground">Sempre ativo</span>
              </div>

              <Separator />

              {/* Som */}
              <div className="flex items-center justify-between">
                <Label htmlFor="sound" className="flex items-center gap-2 cursor-pointer">
                  <Volume2 className="h-4 w-4" />
                  <span>Som de Notificação</span>
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
                  <Label htmlFor="browser" className="flex items-center gap-2 cursor-pointer">
                    <Chrome className="h-4 w-4" />
                    <span>Notificações do Navegador</span>
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
                    Clique no switch para solicitar permissão do navegador
                  </p>
                )}
              </div>

              <Separator />

              {/* Email */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
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
                  <div className="ml-6 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="email-address" className="text-sm">
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
                      <Label htmlFor="digest" className="text-sm cursor-pointer">
                        Receber resumo diário (uma vez por dia)
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Não Perturbe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Não Perturbe
              </CardTitle>
              <CardDescription>
                Configure quando você não deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="dnd-enabled" className="cursor-pointer">
                  Ativar Não Perturbe
                </Label>
                <Switch
                  id="dnd-enabled"
                  checked={dndEnabled}
                  onCheckedChange={setDndEnabled}
                />
              </div>

              {dndEnabled && (
                <div className="ml-6 space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dnd-start" className="text-sm">
                        De
                      </Label>
                      <Input
                        id="dnd-start"
                        type="time"
                        value={dnd.dnd_start_time}
                        onChange={(e) =>
                          setDnd(prev => ({ ...prev, dnd_start_time: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dnd-end" className="text-sm">
                        Até
                      </Label>
                      <Input
                        id="dnd-end"
                        type="time"
                        value={dnd.dnd_end_time}
                        onChange={(e) =>
                          setDnd(prev => ({ ...prev, dnd_end_time: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="weekends"
                      checked={dnd.dnd_weekends}
                      onCheckedChange={(checked) =>
                        setDnd(prev => ({ ...prev, dnd_weekends: checked as boolean }))
                      }
                    />
                    <Label htmlFor="weekends" className="text-sm cursor-pointer">
                      Aplicar nos finais de semana
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Preferências"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
