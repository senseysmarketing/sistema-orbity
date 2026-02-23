import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Meeting } from "@/hooks/useMeetings";
import { useAgency } from "@/hooks/useAgency";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { Calendar, CheckSquare, FileText, MessageSquare, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MeetingContextTabProps {
  meeting: Meeting;
}

const TIMEZONE = "America/Sao_Paulo";

export const MeetingContextTab = ({ meeting }: MeetingContextTabProps) => {
  const { currentAgency } = useAgency();
  const entityId = meeting.client_id || meeting.lead_id;
  const _entityType = meeting.client_id ? "client" : "lead";

  // Fetch previous meetings with the same client/lead
  const { data: previousMeetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["context-meetings", entityId, meeting.id],
    queryFn: async () => {
      if (!entityId || !currentAgency?.id) return [];

      const query = supabase
        .from("meetings")
        .select("id, title, start_time, status, outcome")
        .eq("agency_id", currentAgency.id)
        .neq("id", meeting.id)
        .order("start_time", { ascending: false })
        .limit(5);

      if (meeting.client_id) {
        query.eq("client_id", meeting.client_id);
      } else if (meeting.lead_id) {
        query.eq("lead_id", meeting.lead_id);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!entityId && !!currentAgency?.id,
  });

  // Fetch related tasks
  const { data: relatedTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["context-tasks", meeting.client_id],
    queryFn: async () => {
      if (!meeting.client_id || !currentAgency?.id) return [];

      const { data } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("agency_id", currentAgency.id)
        .eq("client_id", meeting.client_id)
        .in("status", ["todo", "in_progress"])
        .order("due_date", { ascending: true })
        .limit(5);

      return data || [];
    },
    enabled: !!meeting.client_id && !!currentAgency?.id,
  });

  // Fetch recent notes
  const { data: clientNotes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ["context-notes", meeting.client_id],
    queryFn: async () => {
      if (!meeting.client_id || !currentAgency?.id) return [];

      const { data } = await supabase
        .from("client_notes")
        .select("id, content, note_type, created_at")
        .eq("agency_id", currentAgency.id)
        .eq("client_id", meeting.client_id)
        .order("created_at", { ascending: false })
        .limit(3);

      return data || [];
    },
    enabled: !!meeting.client_id && !!currentAgency?.id,
  });

  // Fetch upcoming social media tasks
  const { data: upcomingPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["context-posts", meeting.client_id],
    queryFn: async () => {
      if (!meeting.client_id || !currentAgency?.id) return [];

      // Get task IDs linked to this client via task_clients
      const { data: taskClientLinks } = await supabase
        .from("task_clients")
        .select("task_id")
        .eq("client_id", meeting.client_id);

      const taskIds = taskClientLinks?.map(tc => tc.task_id) || [];
      if (taskIds.length === 0) return [];

      const { data } = await supabase
        .from("tasks")
        .select("id, title, platform, post_date, due_date, status")
        .eq("agency_id", currentAgency.id)
        .eq("task_type", "redes_sociais")
        .in("id", taskIds)
        .in("status", ["todo", "in_progress", "review"])
        .order("post_date", { ascending: true })
        .limit(5);

      return data || [];
    },
    enabled: !!meeting.client_id && !!currentAgency?.id,
  });

  const isLoading = loadingMeetings || loadingTasks || loadingNotes || loadingPosts;

  if (!entityId) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum cliente ou lead associado a esta reunião.</p>
        <p className="text-sm mt-2">Adicione um cliente ou lead para ver o contexto.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    todo: "bg-gray-500",
    in_progress: "bg-blue-500",
    done: "bg-green-500",
    scheduled: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-500",
    no_show: "bg-orange-500",
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6 py-4">
        {/* Previous Meetings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm">Reuniões Anteriores</h4>
          </div>
          {previousMeetings.length > 0 ? (
            <div className="space-y-2">
              {previousMeetings.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(toZonedTime(new Date(m.start_time), TIMEZONE), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {m.status === "completed" ? "Concluída" : m.status === "cancelled" ? "Cancelada" : "Agendada"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma reunião anterior encontrada.</p>
          )}
        </div>

        <Separator />

        {/* Related Tasks */}
        {meeting.client_id && (
          <>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Tarefas Pendentes</h4>
              </div>
              {relatedTasks.length > 0 ? (
                <div className="space-y-2">
                  {relatedTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Vence: {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <div
                        className={`h-2 w-2 rounded-full ${statusColors[task.status] || "bg-gray-500"}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
              )}
            </div>

            <Separator />

            {/* Client Notes */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Notas Recentes</h4>
              </div>
              {clientNotes.length > 0 ? (
                <div className="space-y-2">
                  {clientNotes.map((note: any) => (
                    <div
                      key={note.id}
                      className="p-2 rounded-md bg-muted/50"
                    >
                      <p className="text-sm line-clamp-2">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(note.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma nota encontrada.</p>
              )}
            </div>

            <Separator />

            {/* Upcoming Posts */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Posts Programados</h4>
              </div>
              {upcomingPosts.length > 0 ? (
                <div className="space-y-2">
              {upcomingPosts.map((post: any) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        {(post.post_date || post.due_date) && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(post.post_date || post.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {post.platform}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum post programado.</p>
              )}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
