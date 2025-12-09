import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Building2, Calendar, LayoutDashboard, Key, MessageSquare, CheckSquare, Image, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientOverview } from "@/components/clients/ClientOverview";
import { ClientCredentials } from "@/components/clients/ClientCredentials";
import { ClientTimeline } from "@/components/clients/ClientTimeline";
import { ClientTasks } from "@/components/clients/ClientTasks";
import { ClientPosts } from "@/components/clients/ClientPosts";
import { ClientMeetings } from "@/components/clients/ClientMeetings";
import { ClientFiles } from "@/components/clients/ClientFiles";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentAgency } = useAgency();

  const { data: client, isLoading } = useQuery({
    queryKey: ["client-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Cliente não encontrado</h3>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{client.name}</h1>
                <Badge variant={client.active ? "default" : "secondary"}>
                  {client.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {client.service && <span>{client.service}</span>}
                {client.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Desde {format(new Date(client.start_date), "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 text-xs sm:text-sm">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="credentials" className="flex items-center gap-2 text-xs sm:text-sm">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">Acessos</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2 text-xs sm:text-sm">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Tarefas</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="flex items-center gap-2 text-xs sm:text-sm">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Reuniões</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Arquivos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ClientOverview client={client} />
        </TabsContent>
        <TabsContent value="credentials">
          <ClientCredentials clientId={client.id} />
        </TabsContent>
        <TabsContent value="timeline">
          <ClientTimeline clientId={client.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <ClientTasks clientId={client.id} clientName={client.name} />
        </TabsContent>
        <TabsContent value="posts">
          <ClientPosts clientId={client.id} clientName={client.name} />
        </TabsContent>
        <TabsContent value="meetings">
          <ClientMeetings clientId={client.id} clientName={client.name} />
        </TabsContent>
        <TabsContent value="files">
          <ClientFiles clientId={client.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
