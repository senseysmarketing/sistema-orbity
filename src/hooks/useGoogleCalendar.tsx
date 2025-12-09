import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface GoogleCalendarConnection {
  id: string;
  user_id: string;
  agency_id: string;
  connected_email: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  created_at: string;
  calendar_id: string | null;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole: string;
  description?: string;
}

export const useGoogleCalendar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useQuery({
    queryKey: ["google-calendar-connection", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("id, user_id, agency_id, connected_email, sync_enabled, last_sync_at, created_at, calendar_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as GoogleCalendarConnection | null;
    },
    enabled: !!user?.id,
  });

  const { data: calendarsData, isLoading: isLoadingCalendars, refetch: refetchCalendars } = useQuery({
    queryKey: ["google-calendars", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-list");
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as { calendars: GoogleCalendar[]; selected_calendar_id: string };
    },
    enabled: !!connection,
  });

  const connectGoogleCalendar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { origin_url: window.location.origin },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data.url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (error: any) => {
      console.error("Error connecting to Google Calendar:", error);
      toast.error("Erro ao conectar com Google Calendar");
    },
  });

  const importEvents = useMutation({
    mutationFn: async (days: number = 30) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-import", {
        body: { days },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as { imported: number; total_found: number; already_exists: number; skipped: number; errors?: string[] };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (data.imported > 0) {
        toast.success(`${data.imported} evento(s) importado(s) do Google Calendar`);
      } else {
        toast.info("Nenhum evento novo encontrado para importar");
      }
    },
    onError: (error: any) => {
      console.error("Error importing events:", error);
      toast.error("Erro ao importar eventos do Google Calendar");
    },
  });

  const selectCalendar = useMutation({
    mutationFn: async (calendarId: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("google_calendar_connections")
        .update({ calendar_id: calendarId })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendars"] });
      toast.success("Calendário selecionado com sucesso");
    },
    onError: (error: any) => {
      console.error("Error selecting calendar:", error);
      toast.error("Erro ao selecionar calendário");
    },
  });

  const disconnectGoogleCalendar = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("google_calendar_connections")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      queryClient.invalidateQueries({ queryKey: ["google-calendars"] });
      toast.success("Google Calendar desconectado");
    },
    onError: (error: any) => {
      console.error("Error disconnecting Google Calendar:", error);
      toast.error("Erro ao desconectar Google Calendar");
    },
  });

  const toggleSync = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("google_calendar_connections")
        .update({ sync_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["google-calendar-connection"] });
      toast.success(enabled ? "Sincronização ativada" : "Sincronização desativada");
    },
    onError: (error: any) => {
      console.error("Error toggling sync:", error);
      toast.error("Erro ao alterar sincronização");
    },
  });

  const syncMeeting = async (action: "create" | "update" | "delete", meeting: any) => {
    if (!connection?.sync_enabled) {
      return { synced: false, reason: "sync_disabled" };
    }

    try {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: { action, meeting },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error syncing meeting:", error);
      return { synced: false, error };
    }
  };

  return {
    connection,
    isLoading,
    isConnected: !!connection,
    isSyncEnabled: connection?.sync_enabled ?? false,
    calendars: calendarsData?.calendars || [],
    selectedCalendarId: connection?.calendar_id || calendarsData?.selected_calendar_id || "primary",
    isLoadingCalendars,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    toggleSync,
    syncMeeting,
    importEvents,
    selectCalendar,
    refetchCalendars,
  };
};
