import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preferences {
  reminders_enabled: boolean;
  tasks_enabled: boolean;
  posts_enabled: boolean;
  payments_enabled: boolean;
  leads_enabled: boolean;
  meetings_enabled: boolean;
  system_enabled: boolean;
  browser_notifications: boolean;
  email_digest: boolean;
}

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    reminders_enabled: true,
    tasks_enabled: true,
    posts_enabled: true,
    payments_enabled: true,
    leads_enabled: true,
    meetings_enabled: true,
    system_enabled: true,
    browser_notifications: false,
    email_digest: false,
  });

  useEffect(() => {
    if (open && user) {
      fetchPreferences();
    }
  }, [open, user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          reminders_enabled: data.reminders_enabled,
          tasks_enabled: data.tasks_enabled,
          posts_enabled: data.posts_enabled,
          payments_enabled: data.payments_enabled,
          leads_enabled: data.leads_enabled,
          meetings_enabled: data.meetings_enabled,
          system_enabled: data.system_enabled,
          browser_notifications: data.browser_notifications,
          email_digest: data.email_digest,
        });
      }
    } catch (error: any) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user!.id,
          agency_id: currentAgency.id,
          ...preferences,
        });

      if (error) throw error;

      toast({
        title: "Preferências salvas",
        description: "Suas preferências de notificações foram atualizadas.",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Erro ao salvar preferências",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Preferências de Notificações</DialogTitle>
          <DialogDescription>
            Configure quais tipos de notificações você deseja receber
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Tipos de Notificação</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="reminders" className="flex-1">Lembretes</Label>
              <Switch
                id="reminders"
                checked={preferences.reminders_enabled}
                onCheckedChange={(checked) => updatePreference('reminders_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="tasks" className="flex-1">Tarefas</Label>
              <Switch
                id="tasks"
                checked={preferences.tasks_enabled}
                onCheckedChange={(checked) => updatePreference('tasks_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="posts" className="flex-1">Posts Programados</Label>
              <Switch
                id="posts"
                checked={preferences.posts_enabled}
                onCheckedChange={(checked) => updatePreference('posts_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="payments" className="flex-1">Pagamentos</Label>
              <Switch
                id="payments"
                checked={preferences.payments_enabled}
                onCheckedChange={(checked) => updatePreference('payments_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="leads" className="flex-1">Leads (CRM)</Label>
              <Switch
                id="leads"
                checked={preferences.leads_enabled}
                onCheckedChange={(checked) => updatePreference('leads_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="meetings" className="flex-1">Reuniões</Label>
              <Switch
                id="meetings"
                checked={preferences.meetings_enabled}
                onCheckedChange={(checked) => updatePreference('meetings_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="system" className="flex-1">Sistema</Label>
              <Switch
                id="system"
                checked={preferences.system_enabled}
                onCheckedChange={(checked) => updatePreference('system_enabled', checked)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium text-sm">Canais de Notificação</h4>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="browser" className="font-normal">Notificações do Navegador</Label>
                <p className="text-xs text-muted-foreground">Receba notificações mesmo quando o app não estiver aberto</p>
              </div>
              <Switch
                id="browser"
                checked={preferences.browser_notifications}
                onCheckedChange={(checked) => updatePreference('browser_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="email" className="font-normal">Resumo Diário por E-mail</Label>
                <p className="text-xs text-muted-foreground">Receba um resumo diário das suas notificações</p>
              </div>
              <Switch
                id="email"
                checked={preferences.email_digest}
                onCheckedChange={(checked) => updatePreference('email_digest', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
