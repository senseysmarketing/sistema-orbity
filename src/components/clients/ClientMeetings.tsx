import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Calendar, Clock, Video, MapPin, CheckCircle, XCircle } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ClientMeetingsProps {
  clientId: string;
  clientName: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  scheduled: { color: "bg-blue-500", label: "Agendada" },
  confirmed: { color: "bg-green-500", label: "Confirmada" },
  completed: { color: "bg-purple-500", label: "Realizada" },
  cancelled: { color: "bg-red-500", label: "Cancelada" },
  rescheduled: { color: "bg-amber-500", label: "Reagendada" },
};

const OUTCOME_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  successful: { icon: CheckCircle, color: "text-green-500", label: "Bem-sucedida" },
  follow_up_needed: { icon: Clock, color: "text-amber-500", label: "Requer Follow-up" },
  no_show: { icon: XCircle, color: "text-red-500", label: "Não compareceu" },
  rescheduled: { icon: Calendar, color: "text-blue-500", label: "Reagendada" },
};

export function ClientMeetings({ clientId, clientName }: ClientMeetingsProps) {
  const navigate = useNavigate();

  const { data: meetings, isLoading } = useQuery({
    queryKey: ["client-meetings", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          profiles:organizer_id (name)
        `)
        .eq("client_id", clientId)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upcomingMeetings = meetings?.filter((m) => isFuture(new Date(m.start_time)) && m.status !== "cancelled") || [];
  const pastMeetings = meetings?.filter((m) => isPast(new Date(m.start_time)) || m.status === "completed") || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
              <p className="text-sm text-muted-foreground">Próximas Reuniões</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pastMeetings.length}</p>
              <p className="text-sm text-muted-foreground">Reuniões Realizadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => {
                const statusConfig = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;
                return (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20"
                  >
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold text-blue-600">
                        {format(new Date(meeting.start_time), "dd")}
                      </span>
                      <span className="text-xs text-blue-600">
                        {format(new Date(meeting.start_time), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{meeting.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(meeting.start_time), "HH:mm")} - {format(new Date(meeting.end_time), "HH:mm")}
                            </span>
                            {meeting.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {meeting.location}
                              </span>
                            )}
                            {meeting.google_meet_link && (
                              <a
                                href={meeting.google_meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <Video className="h-3.5 w-3.5" />
                                Google Meet
                              </a>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          <div className={`h-1.5 w-1.5 rounded-full mr-1 ${statusConfig.color}`} />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {meeting.description && (
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {meeting.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Meetings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Histórico de Reuniões</CardTitle>
          <Button size="sm" onClick={() => navigate("/agenda")}>
            <Plus className="h-4 w-4 mr-2" />
            Ver Agenda
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-20 bg-muted rounded-lg" />
              ))}
            </div>
          ) : !pastMeetings?.length ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma reunião realizada ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pastMeetings.slice(0, 10).map((meeting) => {
                const statusConfig = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.scheduled;
                const outcomeConfig = meeting.outcome ? OUTCOME_CONFIG[meeting.outcome] : null;
                const OutcomeIcon = outcomeConfig?.icon;

                return (
                  <div
                    key={meeting.id}
                    className="flex items-start gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-muted flex flex-col items-center justify-center">
                      <span className="text-sm font-bold">
                        {format(new Date(meeting.start_time), "dd")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(meeting.start_time), "MMM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{meeting.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <div className={`h-1.5 w-1.5 rounded-full mr-1 ${statusConfig.color}`} />
                          {statusConfig.label}
                        </Badge>
                        {outcomeConfig && OutcomeIcon && (
                          <span className={`flex items-center gap-1 text-xs ${outcomeConfig.color}`}>
                            <OutcomeIcon className="h-3 w-3" />
                            {outcomeConfig.label}
                          </span>
                        )}
                      </div>
                      {meeting.meeting_notes && (
                        <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {meeting.meeting_notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
