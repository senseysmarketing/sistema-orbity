import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Image, Users, Key, Calendar, Phone, FileText, Clock, MapPin, AlertTriangle } from "lucide-react";
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
    document?: string | null;
    zip_code?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
  };
}

function formatDocumentDisplay(doc: string): string {
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
}

export function ClientOverview({ client }: ClientOverviewProps) {
  const { data: stats } = useQuery({
    queryKey: ["client-stats", client.id],
    queryFn: async () => {
      const { data: taskClientLinks } = await supabase
        .from("task_clients")
        .select("task_id")
        .eq("client_id", client.id);

      const taskIds = taskClientLinks?.map(tc => tc.task_id) || [];

      const [tasksRes, meetingsRes, credentialsRes] = await Promise.all([
        taskIds.length > 0
          ? supabase.from("tasks").select("id, status, task_type", { count: "exact" }).in("id", taskIds)
          : Promise.resolve({ data: [], count: 0, error: null }),
        supabase
          .from("meetings")
          .select("id", { count: "exact" })
          .eq("client_id", client.id),
        supabase
          .from("client_credentials")
          .select("id", { count: "exact" })
          .eq("client_id", client.id),
      ]);

      const allTasks = tasksRes.data || [];
      const pendingTasks = allTasks.filter((t: any) => t.status !== "done" && t.status !== "completed" && t.status !== "cancelled").length;
      const socialTasks = allTasks.filter((t: any) => t.task_type === "redes_sociais");
      const scheduledPosts = socialTasks.filter((t: any) => t.status === "review").length;

      return {
        totalTasks: tasksRes.count || allTasks.length,
        pendingTasks,
        totalPosts: socialTasks.length,
        scheduledPosts,
        totalMeetings: meetingsRes.count || 0,
        totalCredentials: credentialsRes.count || 0,
      };
    },
  });

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

  const hasBillingData = !!(client.document || client.street || client.city);

  const addressLine = [
    client.street,
    client.number ? `Nº ${client.number}` : null,
    client.complement,
  ].filter(Boolean).join(', ');

  const cityLine = [
    client.neighborhood,
    client.city && client.state ? `${client.city}/${client.state}` : client.city,
  ].filter(Boolean).join(' — ');

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

        {/* Billing Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Dados de Faturamento</CardTitle>
              {!client.document && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CPF/CNPJ pendente
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasBillingData ? (
              <div className="space-y-4">
                {client.document && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">{formatDocumentDisplay(client.document)}</p>
                    </div>
                  </div>
                )}
                {(client.street || client.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      {addressLine && <p className="text-sm">{addressLine}</p>}
                      {cityLine && <p className="text-sm">{cityLine}</p>}
                      {client.zip_code && (
                        <p className="text-sm text-muted-foreground">
                          CEP {client.zip_code.replace(/(\d{5})(\d{3})/, '$1-$2')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Dados de faturamento não cadastrados
              </p>
            )}
          </CardContent>
        </Card>
      </div>

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
  );
}
