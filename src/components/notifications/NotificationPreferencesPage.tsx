import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";
import {
  Bell,
  Mail,
  Volume2,
  Chrome,
  Clock,
  Smartphone,
  Loader2,
  ArrowLeft,
  BellOff,
  PauseCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PushDiagnostics } from "./PushDiagnostics";
import { EmailIntegration } from "./integrations/EmailIntegration";
import {
  ROUTING_CATEGORIES,
  ROUTING_CHANNELS,
  type ChannelRouting,
  type RoutingChannel,
  normalizeRouting,
  getCellEnabled,
} from "@/lib/notificationRouting";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Channels {
  sound_enabled: boolean;
  browser_notifications: boolean;
}

interface DoNotDisturb {
  dnd_start_time: string;
  dnd_end_time: string;
  dnd_weekends: boolean;
}

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
    isAndroid,
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
      </div>
    );
  }

  const isEnabled = permission === "granted" && !!token;
  const showIOSWarning = isIOS && !isStandaloneMode;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 cursor-pointer text-sm">
          <Smartphone className="h-4 w-4" />
          <span>Push no Celular</span>
        </Label>
        {isEnabled ? (
          <Button variant="outline" size="sm" onClick={disablePushNotifications} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desativar"}
          </Button>
        ) : (
          <Button variant="default" size="sm" onClick={requestPermission} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isLoading ? "Ativando..." : "Ativar"}
          </Button>
        )}
      </div>

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

      {isAndroid && !isStandaloneMode && !isEnabled && (
        <div className="ml-6 p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">💡 Dica para Android:</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
            Para melhor experiência, instale o app pelo menu ⋮ → "Instalar aplicativo".
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground ml-6">
        {isEnabled
          ? `✓ Push ativo${isStandaloneMode ? " (PWA)" : ""}. Lembre-se de autorizar as notificações nas definições do sistema.`
          : "Receba alertas no celular mesmo com o app fechado."}
      </p>

      {isEnabled && (
        <PushDiagnostics
          token={token}
          permission={permission}
          isStandaloneMode={isStandaloneMode}
          isIOS={isIOS}
          isAndroid={isAndroid}
          isSupported={isSupported}
        />
      )}
    </div>
  );
}

function SnoozeBanner({
  snoozedUntil,
  onResume,
}: {
  snoozedUntil: string;
  onResume: () => void;
}) {
  const until = new Date(snoozedUntil);
  const fmt = until.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <BellOff className="h-5 w-5 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">Modo Foco ativo</p>
          <p className="text-xs text-muted-foreground">
            Notificações pausadas até <strong>{fmt}</strong>. Alertas críticos (faturamento e sistema) continuam sendo entregues.
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onResume}>
        Retomar agora
      </Button>
    </div>
  );
}

function RoutingMatrix({
  routing,
  onChange,
}: {
  routing: ChannelRouting;
  onChange: (next: ChannelRouting) => void;
}) {
  const toggle = (cat: string, ch: RoutingChannel) => {
    const current = getCellEnabled(routing, cat, ch);
    onChange({
      ...routing,
      [cat]: { ...routing[cat], [ch]: !current },
    });
  };

  return (
    <div className="rounded-lg border bg-card/30">
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Categoria</th>
              {ROUTING_CHANNELS.map((c) => (
                <th
                  key={c.key}
                  className="text-center px-4 py-3 font-medium text-muted-foreground w-[140px]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROUTING_CATEGORIES.map((cat) => (
              <tr key={cat.key} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <span className="mr-2">{cat.icon}</span>
                  {cat.label}
                </td>
                {ROUTING_CHANNELS.map((ch) => (
                  <td key={ch.key} className="text-center px-4 py-3">
                    <Checkbox
                      checked={getCellEnabled(routing, cat.key, ch.key)}
                      onCheckedChange={() => toggle(cat.key, ch.key)}
                      aria-label={`${cat.label} - ${ch.label}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y">
        {ROUTING_CATEGORIES.map((cat) => (
          <div key={cat.key} className="p-4 space-y-3">
            <div className="text-sm font-medium">
              <span className="mr-2">{cat.icon}</span>
              {cat.label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {ROUTING_CHANNELS.map((ch) => (
                <label
                  key={ch.key}
                  className="flex flex-col items-center gap-1 rounded-md border bg-background p-2 cursor-pointer"
                >
                  <Checkbox
                    checked={getCellEnabled(routing, cat.key, ch.key)}
                    onCheckedChange={() => toggle(cat.key, ch.key)}
                  />
                  <span className="text-[10px] text-muted-foreground">{ch.mobile}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState<string | null>(null);

  const [routing, setRouting] = useState<ChannelRouting>(() => normalizeRouting({}));

  const [channels, setChannels] = useState<Channels>({
    sound_enabled: true,
    browser_notifications: false,
  });

  const [dnd, setDnd] = useState<DoNotDisturb>({
    dnd_start_time: "22:00",
    dnd_end_time: "08:00",
    dnd_weekends: false,
  });
  const [dndEnabled, setDndEnabled] = useState(false);

  useEffect(() => {
    if (user && currentAgency) {
      void fetchPreferences();
    }
  }, [user, currentAgency]);

  const fetchPreferences = async () => {
    if (!user || !currentAgency?.id) return;
    try {
      setInitialLoading(true);

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("agency_id", currentAgency.id)
        .maybeSingle();

      if (prefs) {
        const stored = (prefs as any).channel_routing;
        let next: ChannelRouting;
        if (stored && typeof stored === "object" && Object.keys(stored).length > 0) {
          next = normalizeRouting(stored);
        } else {
          const legacy: ChannelRouting = {};
          for (const cat of ROUTING_CATEGORIES) {
            const legacyKey = `${cat.key}_enabled` as keyof typeof prefs;
            const legacyVal = (prefs as any)[legacyKey];
            const inApp = legacyVal === false ? false : true;
            legacy[cat.key] = { in_app: inApp, push: true, email: true };
          }
          next = legacy;
        }
        setRouting(next);

        setChannels({
          sound_enabled: prefs.sound_enabled ?? true,
          browser_notifications: prefs.browser_notifications ?? false,
        });

        setDnd({
          dnd_start_time: prefs.dnd_start_time || "22:00",
          dnd_end_time: prefs.dnd_end_time || "08:00",
          dnd_weekends: prefs.dnd_weekends ?? false,
        });
        setDndEnabled(!!(prefs.dnd_start_time || prefs.dnd_end_time));

        const dndUntil = (prefs as any).do_not_disturb_until;
        if (dndUntil && new Date(dndUntil) > new Date()) {
          setSnoozedUntil(dndUntil);
        } else {
          setSnoozedUntil(null);
        }
      }
    } catch (err) {
      console.error("Error fetching preferences:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const requestBrowserPermission = async () => {
    if ("Notification" in window) {
      const p = await Notification.requestPermission();
      if (p === "granted") {
        setChannels((prev) => ({ ...prev, browser_notifications: true }));
        toast.success("Permissão concedida para notificações do navegador");
      } else {
        toast.error("Permissão negada para notificações do navegador");
      }
    }
  };

  const applySnooze = async (hours: number | "tomorrow") => {
    if (!user || !currentAgency?.id) return;
    let until: Date;
    if (hours === "tomorrow") {
      until = new Date();
      until.setDate(until.getDate() + 1);
      until.setHours(8, 0, 0, 0);
    } else {
      until = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
    const iso = until.toISOString();
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            agency_id: currentAgency.id,
            do_not_disturb_until: iso,
          } as any,
          { onConflict: "user_id" },
        );
      if (error) throw error;
      setSnoozedUntil(iso);
      toast.success("Modo Foco ativado");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao ativar Modo Foco");
    }
  };

  const resumeSnooze = async () => {
    if (!user || !currentAgency?.id) return;
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            agency_id: currentAgency.id,
            do_not_disturb_until: null,
          } as any,
          { onConflict: "user_id" },
        );
      if (error) throw error;
      setSnoozedUntil(null);
      toast.success("Notificações retomadas");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao retomar notificações");
    }
  };

  const handleSave = async () => {
    if (!user || !currentAgency?.id) return;
    try {
      setLoading(true);

      const orOfChannels = (cat: string) =>
        getCellEnabled(routing, cat, "in_app") ||
        getCellEnabled(routing, cat, "push") ||
        getCellEnabled(routing, cat, "email");

      const prefsToSave: Record<string, unknown> = {
        user_id: user.id,
        agency_id: currentAgency.id,
        channel_routing: routing,
        leads_enabled: orOfChannels("leads"),
        payments_enabled: orOfChannels("payments"),
        tasks_enabled: orOfChannels("tasks"),
        posts_enabled: orOfChannels("tasks"),
        meetings_enabled: orOfChannels("meetings"),
        system_enabled: orOfChannels("system"),
        reminders_enabled: true,
        expenses_enabled: true,
        sound_enabled: channels.sound_enabled,
        browser_notifications: channels.browser_notifications,
        dnd_start_time: dndEnabled ? dnd.dnd_start_time : null,
        dnd_end_time: dndEnabled ? dnd.dnd_end_time : null,
        dnd_weekends: dndEnabled ? dnd.dnd_weekends : false,
      };

      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .upsert(prefsToSave as any, { onConflict: "user_id" });
      if (prefsError) throw prefsError;

      toast.success("Preferências salvas com sucesso!");
    } catch (err) {
      console.error("Error saving preferences:", err);
      toast.error("Erro ao salvar preferências");
    } finally {
      setLoading(false);
    }
  };

  const isSnoozed = useMemo(
    () => !!snoozedUntil && new Date(snoozedUntil) > new Date(),
    [snoozedUntil],
  );

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/settings")}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Preferências de Notificação</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Central de comando: escolha exatamente o que receber em cada canal.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <PauseCircle className="h-4 w-4" />
              <span className="hidden sm:inline">🔕 Pausar notificações</span>
              <span className="sm:hidden">Pausar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => applySnooze(1)}>Por 1 hora</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applySnooze(2)}>Por 2 horas</DropdownMenuItem>
            <DropdownMenuItem onClick={() => applySnooze("tomorrow")}>Até amanhã (08h)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isSnoozed && snoozedUntil && (
        <SnoozeBanner snoozedUntil={snoozedUntil} onResume={resumeSnooze} />
      )}

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            Matriz de Roteamento
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Escolha onde cada tipo de evento deve chegar.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <RoutingMatrix routing={routing} onChange={setRouting} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Mail className="h-4 w-4 md:h-5 md:w-5" />
            Canais
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Configure e teste os canais de entrega.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <EmailIntegration />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Smartphone className="h-4 w-4 md:h-5 md:w-5" />
            Push (Telemóvel)
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Ative o push e use o diagnóstico para enviar um teste.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <PushNotificationSection />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Volume2 className="h-4 w-4 md:h-5 md:w-5" />
            Som & Navegador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="flex items-center gap-2 cursor-pointer text-sm">
              <Volume2 className="h-4 w-4" />
              Som de notificação
            </Label>
            <Switch
              id="sound"
              checked={channels.sound_enabled}
              onCheckedChange={(checked) => setChannels((p) => ({ ...p, sound_enabled: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label htmlFor="browser" className="flex items-center gap-2 cursor-pointer text-sm">
              <Chrome className="h-4 w-4" />
              Notificações do navegador
            </Label>
            <Switch
              id="browser"
              checked={channels.browser_notifications}
              onCheckedChange={(checked) => {
                if (checked && Notification.permission !== "granted") {
                  void requestBrowserPermission();
                } else {
                  setChannels((p) => ({ ...p, browser_notifications: checked }));
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Clock className="h-4 w-4 md:h-5 md:w-5" />
            Não Perturbe (horário fixo)
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Janela diária de silêncio. Alertas críticos sempre passam.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dnd-enabled" className="cursor-pointer text-sm">
              Ativar Não Perturbe
            </Label>
            <Switch id="dnd-enabled" checked={dndEnabled} onCheckedChange={setDndEnabled} />
          </div>
          {dndEnabled && (
            <div className="ml-4 md:ml-6 space-y-3 md:space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dnd-start" className="text-xs md:text-sm">De</Label>
                  <Input
                    id="dnd-start"
                    type="time"
                    value={dnd.dnd_start_time}
                    onChange={(e) => setDnd((p) => ({ ...p, dnd_start_time: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 md:space-y-2">
                  <Label htmlFor="dnd-end" className="text-xs md:text-sm">Até</Label>
                  <Input
                    id="dnd-end"
                    type="time"
                    value={dnd.dnd_end_time}
                    onChange={(e) => setDnd((p) => ({ ...p, dnd_end_time: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dnd-weekends"
                  checked={dnd.dnd_weekends}
                  onCheckedChange={(checked) => setDnd((p) => ({ ...p, dnd_weekends: checked as boolean }))}
                />
                <Label htmlFor="dnd-weekends" className="text-xs md:text-sm cursor-pointer">
                  Silenciar também nos fins de semana
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-4 -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex justify-end gap-2 md:gap-3">
          <Button variant="outline" onClick={() => navigate("/dashboard/settings")} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
