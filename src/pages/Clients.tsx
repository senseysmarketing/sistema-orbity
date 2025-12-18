import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Building2, Phone, Mail, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Clients() {
  const navigate = useNavigate();
  const { currentAgency } = useAgency();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients-list", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.service?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "active") return matchesSearch && client.active;
    if (filter === "inactive") return matchesSearch && !client.active;
    return matchesSearch;
  });

  const activeCount = clients?.filter(c => c.active).length || 0;
  const inactiveCount = clients?.filter(c => !c.active).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie informações, tarefas e acessos dos seus clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {activeCount} ativos
          </Badge>
          <Badge variant="secondary" className="gap-1">
            {inactiveCount} inativos
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={filter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("active")}
          >
            Ativos
          </Button>
          <Button
            variant={filter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("inactive")}
          >
            Inativos
          </Button>
        </div>
      </div>

      {/* Client Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClients?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "Tente buscar com outros termos" : "Os clientes cadastrados aparecerão aqui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients?.map((client) => (
            <Card
              key={client.id}
              className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => navigate(`/dashboard/clients/${client.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold line-clamp-1">{client.name}</h3>
                      {client.service && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {client.service}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={client.active ? "default" : "secondary"}>
                    {client.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {client.contact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{client.contact}</span>
                    </div>
                  )}
                  {client.start_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Cliente desde {format(new Date(client.start_date), "MMM yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
