import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { Bell, Mail, Volume2, Chrome, Clock, Settings } from "lucide-react";

export function NotificationSummaryCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const [summary, setSummary] = useState({
    activeTypes: [] as string[],
    channels: [] as string[],
    dndActive: false,
    dndTime: "",
  });

  useEffect(() => {
    if (user && currentAgency) {
      fetchSummary();
    }
  }, [user, currentAgency]);

  const fetchSummary = async () => {
    if (!user || !currentAgency?.id) return;

    try {
      // Fetch notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .eq("agency_id", currentAgency.id)
        .single();

      // Fetch email channel
      const { data: emailConfig } = await supabase
        .from("user_notification_channels")
        .select("email_enabled")
        .eq("user_id", user.id)
        .eq("agency_id", currentAgency.id)
        .maybeSingle();

      if (prefs) {
        const types = [];
        if (prefs.reminders_enabled) types.push("Lembretes");
        if (prefs.tasks_enabled) types.push("Tarefas");
        if (prefs.posts_enabled) types.push("Posts");
        if (prefs.payments_enabled) types.push("Pagamentos");
        if (prefs.expenses_enabled) types.push("Despesas");
        if (prefs.leads_enabled) types.push("Leads");
        if (prefs.meetings_enabled) types.push("Reuniões");
        if (prefs.system_enabled) types.push("Sistema");

        const channels = ["Sistema"];
        if (prefs.sound_enabled) channels.push("Som");
        if (prefs.browser_notifications) channels.push("Navegador");
        if (emailConfig?.email_enabled) channels.push("Email");

        const dndActive = !!(prefs.dnd_start_time && prefs.dnd_end_time);
        const dndTime = dndActive
          ? `${prefs.dnd_start_time} - ${prefs.dnd_end_time}`
          : "";

        setSummary({
          activeTypes: types,
          channels,
          dndActive,
          dndTime,
        });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-base sm:text-lg">Minhas Notificações</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard/settings/notifications')}
            className="gap-2 w-full sm:w-auto"
          >
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Resumo das suas preferências de notificação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
        {/* Tipos Ativos */}
        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
            Tipos Ativos ({summary.activeTypes.length})
          </h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {summary.activeTypes.length > 0 ? (
              summary.activeTypes.map((type) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}
                </Badge>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhum tipo de notificação ativo
              </p>
            )}
          </div>
        </div>

        {/* Canais */}
        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
            Canais de Entrega
          </h4>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {summary.channels.map((channel) => {
              let icon = <Bell className="h-3 w-3" />;
              if (channel === "Som") icon = <Volume2 className="h-3 w-3" />;
              if (channel === "Navegador") icon = <Chrome className="h-3 w-3" />;
              if (channel === "Email") icon = <Mail className="h-3 w-3" />;

              return (
                <Badge key={channel} variant="outline" className="gap-1 text-xs">
                  {icon}
                  {channel}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Não Perturbe */}
        <div className="space-y-2">
          <h4 className="text-xs sm:text-sm font-medium flex items-center gap-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            Não Perturbe
          </h4>
          {summary.dndActive ? (
            <Badge variant="secondary" className="gap-2 text-xs">
              <Clock className="h-3 w-3" />
              {summary.dndTime}
            </Badge>
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground">Desativado</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
