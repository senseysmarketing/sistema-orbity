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
  VolumeX,
  Chrome,
  Clock,
  Smartphone,
  Loader2,
  ArrowLeft,
  BellOff,
  PauseCircle,
  Send,
  Wifi,
  Share2,
  PlusSquare,
  Lock,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
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

interface DoNotDisturb {
  dnd_start_time: string;
  dnd_end_time: string;
  dnd_weekends: boolean;
}

// ============ APP Orbity (PWA Push) Section ============
function AppOrbityCard() {
  const {
    permission,
    isSupported,
    isLoading,
    hasFirebaseConfig,
    requestPermission,
    disablePushNotifications,
    token,
    isStandaloneMode,
  } = usePushNotifications();
  const { user } = useAuth();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [testing, setTesting] = useState(false);

  const isEnabled = permission === "granted" && !!token;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      if (!token) {
        toast.error("Sem token ativo", {
          description: "Ative as notificações do APP primeiro.",
        });
        return;
      }
      const { count } = await supabase
        .from("push_subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_active", true);
      if ((count ?? 0) > 0) {
        toast.success("Conexão ativa", {
          description: `${count} dispositivo(s) registrado(s) para receber notificações.`,
        });
      } else {
        toast.error("Nenhuma conexão ativa", {
          description: "Tente desativar e ativar novamente.",
        });
      }
    } catch (err: any) {
      toast.error("Erro ao verificar", { description: err?.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTest = async () => {
    if (!user) return;
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: user.id,
          title: "🔔 Teste APP Orbity",
          body: "Se você está vendo isto, as notificações do APP estão a funcionar!",
          data: { action_url: "/dashboard/settings/notifications", test: "true" },
        },
      });
      if (error) throw error;
      if (data?.sent > 0) {
        toast.success("Notificação enviada", {
          description: `${data.sent}/${data.total} dispositivo(s) — aguarde alguns segundos.`,
        });
      } else {
        toast.error("Falha no envio", {
          description: "Nenhum dispositivo recebeu. Tente reativar as notificações.",
        });
      }
    } catch (err: any) {
      toast.error("Erro no teste", { description: err?.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Card className="bg-card/30">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="rounded-md bg-primary/10 p-2 shrink-0">
                <Smartphone className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base">APP Orbity</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Notificações push no telemóvel, mesmo com o app fechado.
                </CardDescription>
              </div>
            </div>
            {isEnabled && (
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                ATIVO
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-6 pt-0 space-y-3">
          {!hasFirebaseConfig || !isSupported ? (
            <p className="text-xs text-muted-foreground">
              Push não disponível neste dispositivo.
            </p>
          ) : !isStandaloneMode ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Para receber notificações no telemóvel, instale o Orbity como aplicação no seu
                ecrã principal.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstallModal(true)}
              >
                <Smartphone className="mr-2 h-4 w-4" />
                Como instalar o APP Orbity
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {!isEnabled ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={requestPermission}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ativar notificações do APP
                </Button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleVerify}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="mr-2 h-4 w-4" />
                    )}
                    Verificar Conexão
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSendTest}
                    disabled={testing}
                  >
                    {testing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar Notificação de Teste
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disablePushNotifications}
                    disabled={isLoading}
                  >
                    Desativar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Instalar o APP Orbity
            </DialogTitle>
            <DialogDescription>
              Em apenas 2 passos, o Orbity vai ficar no ecrã do seu telemóvel como qualquer outra
              aplicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/30">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <Share2 className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">1. Abra o menu de partilha</p>
                <p className="text-xs text-muted-foreground">
                  No <strong>iPhone (Safari)</strong>, toque no ícone de partilhar (↑) na barra
                  inferior. No <strong>Android (Chrome)</strong>, toque no menu (⋮) no canto
                  superior direito.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card/30">
              <div className="rounded-full bg-primary/10 p-2 shrink-0">
                <PlusSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">2. Adicionar ao Ecrã Principal</p>
                <p className="text-xs text-muted-foreground">
                  Selecione <strong>"Adicionar ao Ecrã Principal"</strong> (ou "Instalar
                  aplicação") e confirme. Depois, abra o Orbity pelo ícone instalado e ative as
                  notificações aqui.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============ Browser Notifications Section ============
function BrowserNotificationsCard({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  const { permission, requestPermission, showNotification } = useBrowserNotifications();
  const [testing, setTesting] = useState(false);

  const handleActivate = async () => {
    const granted = await requestPermission();
    if (granted) onChange(true);
  };

  const handleTest = () => {
    setTesting(true);
    showNotification("🔔 Alerta de Teste — Orbity", {
      body: "As notificações do navegador estão a funcionar perfeitamente!",
      tag: "browser-test",
    });
    setTimeout(() => setTesting(false), 1000);
  };

  return (
    <Card className="bg-card/30">
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="rounded-md bg-primary/10 p-2 shrink-0">
              <Chrome className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">Notificações do Navegador</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Receba alertas nativos do Chrome, Safari ou Edge enquanto trabalha no
                computador.
              </CardDescription>
            </div>
          </div>
          {permission === "granted" && enabled && (
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
              ATIVO
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6 pt-0 space-y-3">
        {permission === "denied" ? (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              As notificações estão bloqueadas. Clique no ícone de cadeado (🔒) na barra de
              endereço do seu navegador e altere a permissão de Notificações para{" "}
              <strong>"Permitir"</strong>.
            </p>
          </div>
        ) : permission !== "granted" ? (
          <Button variant="default" size="sm" onClick={handleActivate}>
            <Chrome className="mr-2 h-4 w-4" />
            Ativar neste computador
          </Button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="browser-toggle"
                checked={enabled}
                onCheckedChange={onChange}
              />
              <Label htmlFor="browser-toggle" className="text-sm cursor-pointer">
                Receber alertas do navegador
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar Alerta de Teste
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ Snooze Banner ============
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
            Notificações pausadas até <strong>{fmt}</strong>. Alertas críticos (faturamento e
            sistema) continuam sendo entregues.
          </p>
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onResume}>
        Retomar agora
      </Button>
    </div>
  );
}

// ============ Routing Matrix ============
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
                  className="text-center px-3 py-3 font-medium text-muted-foreground"
                >
                  {c.key === "push" ? "APP" : c.key === "in_app" ? "Sistema" : "E-mail"}
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
                  <td key={ch.key} className="text-center px-3 py-3">
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
                  <span className="text-[10px] text-muted-foreground">
                    {ch.key === "push" ? "APP" : ch.mobile}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Main Page ============
export function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState<string | null>(null);

  const [routing, setRouting] = useState<ChannelRouting>(() => normalizeRouting({}));

  // Sound: auto-saved separately from form
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundSaving, setSoundSaving] = useState(false);

  // Browser & Email: part of unified form (no local save buttons)
  const [browserEnabled, setBrowserEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        setSoundEnabled(prefs.sound_enabled ?? true);
        setBrowserEnabled(prefs.browser_notifications ?? false);

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

      // Email integration is per-agency
      const { data: integ } = await supabase
        .from("notification_integrations")
        .select("email_enabled")
        .eq("agency_id", currentAgency.id)
        .maybeSingle();
      if (integ) setEmailEnabled(integ.email_enabled || false);
    } catch (err) {
      console.error("Error fetching preferences:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  // Auto-save for sound toggle
  const handleSoundToggle = async (value: boolean) => {
    if (!user || !currentAgency?.id) return;
    setSoundEnabled(value);
    setSoundSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: user.id,
            agency_id: currentAgency.id,
            sound_enabled: value,
          } as any,
          { onConflict: "user_id" },
        );
      if (error) throw error;
      toast.success("Preferência de som atualizada", {
        duration: 2000,
      });
    } catch (err: any) {
      toast.error("Erro ao salvar som", { description: err?.message });
      setSoundEnabled(!value); // revert
    } finally {
      setSoundSaving(false);
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
        sound_enabled: soundEnabled,
        browser_notifications: browserEnabled,
        dnd_start_time: dndEnabled ? dnd.dnd_start_time : null,
        dnd_end_time: dndEnabled ? dnd.dnd_end_time : null,
        dnd_weekends: dndEnabled ? dnd.dnd_weekends : false,
      };

      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .upsert(prefsToSave as any, { onConflict: "user_id" });
      if (prefsError) throw prefsError;

      // Persist email integration toggle (agency-scoped)
      const { error: integError } = await supabase
        .from("notification_integrations")
        .upsert(
          {
            agency_id: currentAgency.id,
            email_enabled: emailEnabled,
            email_from_name: "Orbity",
            email_from_address: "contato@orbityapp.com.br",
            email_provider: "resend",
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "agency_id" },
        );
      if (integError) throw integError;

      toast.success("Preferências salvas com sucesso!");
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      toast.error("Erro ao salvar preferências", { description: err?.message });
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
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/settings")}
          className="shrink-0 self-start"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Preferências de Notificação
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Central de comando: escolha exatamente o que receber em cada canal.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Sound toggle (auto-save) */}
          <div className="flex items-center gap-2 rounded-md border bg-card/30 px-3 h-9">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            <Label
              htmlFor="sound-header"
              className="text-xs cursor-pointer hidden md:inline"
            >
              Sons do sistema
            </Label>
            <Switch
              id="sound-header"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
              disabled={soundSaving}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <PauseCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Pausar notificações</span>
                <span className="sm:hidden">Pausar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => applySnooze(1)}>Por 1 hora</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applySnooze(2)}>Por 2 horas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => applySnooze("tomorrow")}>
                Até amanhã (08h)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isSnoozed && snoozedUntil && (
        <SnoozeBanner snoozedUntil={snoozedUntil} onResume={resumeSnooze} />
      )}

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Rules */}
        <div className="space-y-6">
          <Card className="bg-card/30">
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

          <Card className="bg-card/30">
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
                          setDnd((p) => ({ ...p, dnd_start_time: e.target.value }))
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
                          setDnd((p) => ({ ...p, dnd_end_time: e.target.value }))
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
                        setDnd((p) => ({ ...p, dnd_weekends: checked as boolean }))
                      }
                    />
                    <Label
                      htmlFor="dnd-weekends"
                      className="text-xs md:text-sm cursor-pointer"
                    >
                      Silenciar também nos fins de semana
                    </Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Delivery Channels */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Info className="h-3.5 w-3.5" />
            <span>Canais de entrega — onde você quer receber as notificações.</span>
          </div>

          <AppOrbityCard />

          <BrowserNotificationsCard
            enabled={browserEnabled}
            onChange={setBrowserEnabled}
          />

          <Card className="bg-card/30">
            <CardContent className="p-4 md:p-6">
              <EmailIntegration enabled={emailEnabled} onChange={setEmailEnabled} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky Footer (global save) */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[var(--sidebar-width,16rem)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-3 px-4 md:px-6 z-30">
        <div className="flex justify-end gap-2 md:gap-3 max-w-[1600px] mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/settings")}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar alterações"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
