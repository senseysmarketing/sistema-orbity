import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Building2, ChevronRight, Phone, Mail, Plus, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClientHealthScore } from "@/components/clients/ClientHealthScore";
import { ClientForm } from "@/components/admin/ClientForm";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const navigate = useNavigate();
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [clientFormOpen, setClientFormOpen] = useState(false);

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

  // Fetch pending task counts per client for Health Score
  const { data: taskCountsMap } = useQuery({
    queryKey: ["client-task-counts", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return {};
      const { data, error } = await supabase
        .from("task_clients")
        .select("client_id, tasks!inner(status, agency_id)")
        .eq("tasks.agency_id", currentAgency.id)
        .not("tasks.status", "in", '("done","cancelled")');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((row: any) => {
        counts[row.client_id] = (counts[row.client_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!currentAgency?.id,
    staleTime: 5 * 60 * 1000,
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.service?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "active") return matchesSearch && client.active;
    if (filter === "inactive") return matchesSearch && !client.active;
    return matchesSearch;
  });

  const activeCount = clients?.filter((c) => c.active).length || 0;
  const inactiveCount = clients?.filter((c) => !c.active).length || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie informações, tarefas e acessos dos seus clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {activeCount} ativos
            </Badge>
            <Badge variant="secondary" className="gap-1">
              {inactiveCount} inativos
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            navigate("/dashboard/admin");
            toast({ title: "Gerenciar Carteira", description: "Acesse a gestão completa no Centro de Comando." });
          }}>
            <Briefcase className="h-4 w-4 mr-1" />
            Gerenciar Carteira
          </Button>
          <Button variant="create" size="sm" onClick={() => setClientFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Cliente
          </Button>
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
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            Todos
          </Button>
          <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>
            Ativos
          </Button>
          <Button variant={filter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setFilter("inactive")}>
            Inativos
          </Button>
        </div>
      </div>

      {/* Smart Table */}
      {isLoading ? (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Health Score</TableHead>
                <TableHead className="hidden lg:table-cell">Desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-20" /></div></div></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="hidden md:table-cell font-semibold">Contato</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold">Health Score</TableHead>
                <TableHead className="hidden lg:table-cell font-semibold">Desde</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients?.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800"
                  onClick={() => navigate(`/dashboard/clients/${client.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{client.name}</p>
                        {client.service && (
                          <p className="text-xs text-muted-foreground truncate">{client.service}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5 text-sm text-muted-foreground">
                      {client.contact && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.contact}</span>
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.active ? "success" : "secondary"}>
                      {client.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <ClientHealthScore
                      startDate={client.start_date}
                      pendingTaskCount={taskCountsMap?.[client.id] || 0}
                    />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {client.start_date
                      ? format(new Date(client.start_date), "MMM yyyy", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* Client Form Dialog */}
      <ClientForm
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clients-list"] });
          setClientFormOpen(false);
        }}
      />
    </div>
  );
}
