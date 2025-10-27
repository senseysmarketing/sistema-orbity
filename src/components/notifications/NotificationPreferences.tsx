import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bell, Clock, Calendar, DollarSign, Users, 
  MessageSquare, AlertTriangle, Volume2, Moon 
} from "lucide-react";

interface NotificationPreferencesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Preferences {
  // Tipos de notificação
  reminders_enabled: boolean;
  tasks_enabled: boolean;
  posts_enabled: boolean;
  payments_enabled: boolean;
  leads_enabled: boolean;
  meetings_enabled: boolean;
  system_enabled: boolean;
  expenses_enabled: boolean;
  
  // Períodos personalizados
  reminder_advance_minutes: number;
  task_advance_hours: number;
  post_advance_hours: number;
  payment_advance_days: number;
  payment_repeat_enabled: boolean;
  payment_repeat_days: number;
  lead_inactive_days: number;
  meeting_advance_minutes: number;
  expense_advance_days: number;
  
  // Do Not Disturb
  dnd_start_time: string | null;
  dnd_end_time: string | null;
  dnd_weekends: boolean;
  dnd_holidays: boolean;
  
  // Canais
  browser_notifications: boolean;
  email_digest: boolean;
  sound_enabled: boolean;
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
    expenses_enabled: true,
    reminder_advance_minutes: 120,
    task_advance_hours: 24,
    post_advance_hours: 3,
    payment_advance_days: 3,
    payment_repeat_enabled: false,
    payment_repeat_days: 1,
    lead_inactive_days: 7,
    meeting_advance_minutes: 60,
    expense_advance_days: 3,
    dnd_start_time: null,
    dnd_end_time: null,
    dnd_weekends: false,
    dnd_holidays: false,
    browser_notifications: false,
    email_digest: false,
    sound_enabled: true,
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
          reminders_enabled: data.reminders_enabled ?? true,
          tasks_enabled: data.tasks_enabled ?? true,
          posts_enabled: data.posts_enabled ?? true,
          payments_enabled: data.payments_enabled ?? true,
          leads_enabled: data.leads_enabled ?? true,
          meetings_enabled: data.meetings_enabled ?? true,
          system_enabled: data.system_enabled ?? true,
          expenses_enabled: data.expenses_enabled ?? true,
          reminder_advance_minutes: data.reminder_advance_minutes ?? 120,
          task_advance_hours: data.task_advance_hours ?? 24,
          post_advance_hours: data.post_advance_hours ?? 3,
          payment_advance_days: data.payment_advance_days ?? 3,
          payment_repeat_enabled: data.payment_repeat_enabled ?? false,
          payment_repeat_days: data.payment_repeat_days ?? 1,
          lead_inactive_days: data.lead_inactive_days ?? 7,
          meeting_advance_minutes: data.meeting_advance_minutes ?? 60,
          expense_advance_days: data.expense_advance_days ?? 3,
          dnd_start_time: data.dnd_start_time ?? null,
          dnd_end_time: data.dnd_end_time ?? null,
          dnd_weekends: data.dnd_weekends ?? false,
          dnd_holidays: data.dnd_holidays ?? false,
          browser_notifications: data.browser_notifications ?? false,
          email_digest: data.email_digest ?? false,
          sound_enabled: data.sound_enabled ?? true,
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
        }, {
          onConflict: 'user_id'
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Notificações</DialogTitle>
          <DialogDescription>
            Configure os tipos de notificações, períodos de antecedência e horários de silêncio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Accordion type="multiple" className="w-full" defaultValue={["types", "channels"]}>
            {/* Tipos e Períodos de Notificação */}
            <AccordionItem value="types">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>Tipos de Notificação e Períodos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* Lembretes */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reminders" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Lembretes
                    </Label>
                    <Switch
                      id="reminders"
                      checked={preferences.reminders_enabled}
                      onCheckedChange={(checked) => updatePreference('reminders_enabled', checked)}
                    />
                  </div>
                  {preferences.reminders_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Antecedência padrão</Label>
                      <Select
                        value={preferences.reminder_advance_minutes.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, reminder_advance_minutes: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                          <SelectItem value="1440">1 dia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Tarefas */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tasks" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Tarefas
                    </Label>
                    <Switch
                      id="tasks"
                      checked={preferences.tasks_enabled}
                      onCheckedChange={(checked) => updatePreference('tasks_enabled', checked)}
                    />
                  </div>
                  {preferences.tasks_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Notificar quantas horas antes</Label>
                      <Select
                        value={preferences.task_advance_hours.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, task_advance_hours: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hora</SelectItem>
                          <SelectItem value="6">6 horas</SelectItem>
                          <SelectItem value="12">12 horas</SelectItem>
                          <SelectItem value="24">24 horas (1 dia)</SelectItem>
                          <SelectItem value="48">48 horas (2 dias)</SelectItem>
                          <SelectItem value="72">72 horas (3 dias)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Posts */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="posts" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Posts Social Media
                    </Label>
                    <Switch
                      id="posts"
                      checked={preferences.posts_enabled}
                      onCheckedChange={(checked) => updatePreference('posts_enabled', checked)}
                    />
                  </div>
                  {preferences.posts_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Antecedência</Label>
                      <Select
                        value={preferences.post_advance_hours.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, post_advance_hours: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0.5">30 minutos</SelectItem>
                          <SelectItem value="1">1 hora</SelectItem>
                          <SelectItem value="3">3 horas</SelectItem>
                          <SelectItem value="6">6 horas</SelectItem>
                          <SelectItem value="12">12 horas</SelectItem>
                          <SelectItem value="24">24 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Pagamentos */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="payments" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pagamentos de Clientes
                    </Label>
                    <Switch
                      id="payments"
                      checked={preferences.payments_enabled}
                      onCheckedChange={(checked) => updatePreference('payments_enabled', checked)}
                    />
                  </div>
                  {preferences.payments_enabled && (
                    <div className="ml-6 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Notificar quantos dias antes</Label>
                        <Select
                          value={preferences.payment_advance_days.toString()}
                          onValueChange={(value) => setPreferences(p => ({ ...p, payment_advance_days: parseInt(value) }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 dia</SelectItem>
                            <SelectItem value="3">3 dias</SelectItem>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="15">15 dias</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Repetir se não pago</Label>
                        <Switch
                          checked={preferences.payment_repeat_enabled}
                          onCheckedChange={(checked) => setPreferences(p => ({ ...p, payment_repeat_enabled: checked }))}
                        />
                      </div>
                      {preferences.payment_repeat_enabled && (
                        <>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Repetir a cada</Label>
                            <Select
                              value={preferences.payment_repeat_days.toString()}
                              onValueChange={(value) => setPreferences(p => ({ ...p, payment_repeat_days: parseInt(value) }))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Diariamente</SelectItem>
                                <SelectItem value="2">A cada 2 dias</SelectItem>
                                <SelectItem value="7">Semanalmente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                              ⚡ Repetição ativa: você receberá notificações a cada {preferences.payment_repeat_days} dia(s) 
                              para pagamentos não realizados após o vencimento
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Despesas */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="expenses" className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Despesas
                    </Label>
                    <Switch
                      id="expenses"
                      checked={preferences.expenses_enabled}
                      onCheckedChange={(checked) => updatePreference('expenses_enabled', checked)}
                    />
                  </div>
                  {preferences.expenses_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Notificar quantos dias antes</Label>
                      <Select
                        value={preferences.expense_advance_days.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, expense_advance_days: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 dia</SelectItem>
                          <SelectItem value="3">3 dias</SelectItem>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="15">15 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Leads */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="leads" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Leads (CRM)
                    </Label>
                    <Switch
                      id="leads"
                      checked={preferences.leads_enabled}
                      onCheckedChange={(checked) => updatePreference('leads_enabled', checked)}
                    />
                  </div>
                  {preferences.leads_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Notificar após quantos dias sem contato</Label>
                      <Select
                        value={preferences.lead_inactive_days.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, lead_inactive_days: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 dias</SelectItem>
                          <SelectItem value="5">5 dias</SelectItem>
                          <SelectItem value="7">7 dias</SelectItem>
                          <SelectItem value="14">14 dias</SelectItem>
                          <SelectItem value="30">30 dias</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Reuniões */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="meetings" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Reuniões
                    </Label>
                    <Switch
                      id="meetings"
                      checked={preferences.meetings_enabled}
                      onCheckedChange={(checked) => updatePreference('meetings_enabled', checked)}
                    />
                  </div>
                  {preferences.meetings_enabled && (
                    <div className="ml-6 space-y-2">
                      <Label className="text-xs text-muted-foreground">Antecedência</Label>
                      <Select
                        value={preferences.meeting_advance_minutes.toString()}
                        onValueChange={(value) => setPreferences(p => ({ ...p, meeting_advance_minutes: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="60">1 hora</SelectItem>
                          <SelectItem value="120">2 horas</SelectItem>
                          <SelectItem value="1440">24 horas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Sistema */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="system">Notificações de Sistema</Label>
                    <Switch
                      id="system"
                      checked={preferences.system_enabled}
                      onCheckedChange={(checked) => updatePreference('system_enabled', checked)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Modo Não Perturbe */}
            <AccordionItem value="dnd">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <span>Modo Não Perturbe</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dnd_start">Início</Label>
                    <Input
                      id="dnd_start"
                      type="time"
                      value={preferences.dnd_start_time || ''}
                      onChange={(e) => setPreferences(p => ({ ...p, dnd_start_time: e.target.value || null }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dnd_end">Fim</Label>
                    <Input
                      id="dnd_end"
                      type="time"
                      value={preferences.dnd_end_time || ''}
                      onChange={(e) => setPreferences(p => ({ ...p, dnd_end_time: e.target.value || null }))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="dnd_weekends">Silenciar nos finais de semana</Label>
                  <Switch
                    id="dnd_weekends"
                    checked={preferences.dnd_weekends}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, dnd_weekends: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="dnd_holidays">Silenciar em feriados</Label>
                  <Switch
                    id="dnd_holidays"
                    checked={preferences.dnd_holidays}
                    onCheckedChange={(checked) => setPreferences(p => ({ ...p, dnd_holidays: checked }))}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Canais de Notificação */}
            <AccordionItem value="channels">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span>Canais de Entrega</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
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

                <div className="flex items-center justify-between p-3 border rounded-lg">
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

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="sound" className="font-normal flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Som de Notificação
                    </Label>
                    <p className="text-xs text-muted-foreground">Reproduzir som ao receber notificações</p>
                  </div>
                  <Switch
                    id="sound"
                    checked={preferences.sound_enabled}
                    onCheckedChange={(checked) => updatePreference('sound_enabled', checked)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-6 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <span>💡</span>
              Status do Sistema de Notificações
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>CRON Job: Ativo (executa a cada 30 minutos)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>Sistema de Tracking: Habilitado (evita notificações duplicadas)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={preferences.browser_notifications ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                  {preferences.browser_notifications ? "✅" : "⚠️"}
                </span>
                <span>Notificações do Navegador: {preferences.browser_notifications ? 'Ativas' : 'Desativadas'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={preferences.sound_enabled ? "text-green-600 dark:text-green-400" : "text-gray-400"}>
                  {preferences.sound_enabled ? "🔔" : "🔕"}
                </span>
                <span>Som de Notificações: {preferences.sound_enabled ? 'Ativo' : 'Desativado'}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
              <p>💡 Dica: As notificações são verificadas automaticamente e respeitam todas as suas preferências configuradas acima.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Preferências"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
