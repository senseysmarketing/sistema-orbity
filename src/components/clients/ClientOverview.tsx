import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Image, Users, Key, Calendar, Phone, FileText, Clock } from "lucide-react";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientOverviewProps {
  client: {
    id: string;
    name: string;
    contact?: string | null;
    service?: string | null;
    observations?: string | null;
    start_date?: string | null;
    active: boolean;
  };
}

export function ClientOverview({ client }: ClientOverviewProps) {
  // Fetch counts for different entities
  const { data: stats } = useQuery({
    queryKey: ["client-stats", client.id],
    queryFn: async () => {
      const [tasksRes, postsRes, meetingsRes, credentialsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, status", { count: "exact" })
          .eq("client_id", client.id),
        supabase
          .from("social_media_posts")
          .select("id, status", { count: "exact" })
          .eq("client_id", client.id),
        supabase
          .from("meetings")
          .select("id", { count: "exact" })
          .eq("client_id", client.id),
        supabase
          .from("client_credentials")
          .select("id", { count: "exact" })
          .eq("client_id", client.id),
      ]);

      const pendingTasks = tasksRes.data?.filter(t => t.status !== "done" && t.status !== "cancelled").length || 0;
      const scheduledPosts = postsRes.data?.filter(p => p.status === "approved" || p.status === "scheduled").length || 0;

      return {
        totalTasks: tasksRes.count || 0,
        pendingTasks,
        totalPosts: postsRes.count || 0,
        scheduledPosts,
        totalMeetings: meetingsRes.count || 0,
        totalCredentials: credentialsRes.count || 0,
      };
    },
  });

  // Fetch upcoming meetings
  const { data: upcomingMeetings } = useQuery({
    queryKey: ["client-upcoming-meetings", client.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("meetings")
        .select("id, title, start_time")
        .eq("client_id", client.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time")
        .limit(3);
      return data || [];
    },
  });

  const clientAge = client.start_date
    ? differenceInMonths(new Date(), new Date(client.start_date))
    : null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarefas</p>
                <p className="text-2xl font-bold">{stats?.totalTasks || 0}</p>
                {stats?.pendingTasks ? (
                  <p className="text-xs text-orange-600">{stats.pendingTasks} pendentes</p>
                ) : null}
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <CheckSquare className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Posts</p>
                <p className="text-2xl font-bold">{stats?.totalPosts || 0}</p>
                {stats?.scheduledPosts ? (
                  <p className="text-xs text-green-600">{stats.scheduledPosts} agendados</p>
                ) : null}
              </div>
              <div className="h-12 w-12 rounded-full bg-pink-500/10 flex items-center justify-center">
                <Image className="h-6 w-6 text-pink-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reuniões</p>
                <p className="text-2xl font-bold">{stats?.totalMeetings || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acessos</p>
                <p className="text-2xl font-bold">{stats?.totalCredentials || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Key className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.contact && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.contact}</span>
              </div>
            )}
            {client.service && (
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>{client.service}</span>
              </div>
            )}
            {client.start_date && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Cliente desde {format(new Date(client.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            )}
            {clientAge !== null && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {clientAge < 1 
                    ? `${differenceInDays(new Date(), new Date(client.start_date!))} dias de parceria`
                    : `${clientAge} ${clientAge === 1 ? "mês" : "meses"} de parceria`}
                </span>
              </div>
            )}
            {client.observations && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{client.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas Reuniões</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings && upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div key={meeting.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{meeting.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(meeting.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {differenceInDays(new Date(meeting.start_time), new Date()) === 0
                        ? "Hoje"
                        : `Em ${differenceInDays(new Date(meeting.start_time), new Date())} dias`}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma reunião agendada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
