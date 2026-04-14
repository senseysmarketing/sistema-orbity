import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronRight, Trash2, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ChurnAnalysis } from "@/components/admin/ChurnAnalysis";
import { ClientForm } from "@/components/admin/ClientForm";
import type { Client } from "@/hooks/useFinancialMetrics";

interface ClientManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  selectedMonth: string;
  agencyId: string;
}

export function ClientManagementSheet({ open, onOpenChange, clients, selectedMonth }: ClientManagementSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [churnOpen, setChurnOpen] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmClient, setConfirmClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [loadingClientId, setLoadingClientId] = useState<string | null>(null);

  const handleEditClient = async (client: Client) => {
    setLoadingClientId(client.id);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", client.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Cliente não encontrado.");
      setEditingClient(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cliente",
        description: error.message || "Não foi possível carregar os detalhes do cliente. Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setLoadingClientId(null);
    }
  };

  const filteredClients = useMemo(() => {
    if (filter === "active") return clients.filter(c => c.active);
    if (filter === "inactive") return clients.filter(c => !c.active);
    return clients;
  }, [clients, filter]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({
          active: activate,
          cancelled_at: activate ? null : new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { activate }) => {
      toast({
        title: activate ? "Cliente reativado" : "Cliente inativado",
        description: activate
          ? "O cliente voltou a compor o MRR."
          : "O cliente foi removido do MRR e cobranças futuras suspensas.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments-all"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cliente excluído", description: "O cliente e todos os seus dados foram removidos permanentemente." });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["admin-payments-all"] });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const handleToggle = (client: Client) => {
    if (client.active) {
      setConfirmClient(client);
    } else {
      toggleMutation.mutate({ id: client.id, activate: true });
    }
  };

  const confirmDeactivate = () => {
    if (!confirmClient) return;
    toggleMutation.mutate({ id: confirmClient.id, activate: false });
    setConfirmClient(null);
  };

  const confirmDelete = () => {
    if (!deleteClient) return;
    deleteMutation.mutate(deleteClient.id);
    setDeleteClient(null);
  };

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  // Map Client to ChurnAnalysis expected shape
  const churnClients = clients.map(c => ({
    id: c.id,
    name: c.name,
    monthly_value: c.monthly_value,
    active: c.active,
    cancelled_at: c.cancelled_at,
    start_date: c.start_date,
  }));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-[600px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-3">
            <SheetTitle>Gerenciar Carteira</SheetTitle>
            <SheetDescription>Análise de churn e gestão de status dos clientes</SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 pb-6 space-y-6">
              {/* Churn Section */}
              <Collapsible open={churnOpen} onOpenChange={setChurnOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full hover:text-foreground/80 transition-colors">
                  {churnOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Análise de Churn
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <ChurnAnalysis clients={churnClients} selectedMonth={selectedMonth} />
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Client List */}
              <div className="space-y-4">
                <Tabs defaultValue="all" onValueChange={setFilter}>
                  <TabsList className="w-full">
                    <TabsTrigger value="all" className="flex-1">
                      Todos ({clients.length})
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex-1">
                      Ativos ({clients.filter(c => c.active).length})
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex-1">
                      Inativos ({clients.filter(c => !c.active).length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum cliente encontrado
                    </p>
                  ) : (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.monthly_value
                              ? formatCurrency(client.monthly_value)
                              : "Sem valor"}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleEditClient(client)}
                          disabled={loadingClientId === client.id}
                        >
                          {loadingClientId === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Pencil className="h-4 w-4" />
                          )}
                        </Button>
                        {!client.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteClient(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Badge
                          variant={client.active ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {client.active ? "Ativo" : "Inativo"}
                        </Badge>
                        <Switch
                          checked={client.active}
                          onCheckedChange={() => handleToggle(client)}
                          disabled={toggleMutation.isPending}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Deactivation Confirmation */}
      <AlertDialog open={!!confirmClient} onOpenChange={(o) => { if (!o) setConfirmClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja inativar <strong>{confirmClient?.name}</strong>?
              Ele será removido do seu MRR atual e as futuras cobranças automáticas serão suspensas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClient} onOpenChange={(o) => { if (!o) setDeleteClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteClient?.name}</strong>?
              Esta ação é <strong>irreversível</strong> e removerá todos os dados associados a este cliente (pagamentos, notas, arquivos, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Client Form */}
      <ClientForm
        open={!!editingClient}
        onOpenChange={(o) => { if (!o) setEditingClient(null); }}
        client={editingClient}
        onSuccess={() => {
          setEditingClient(null);
          queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
          queryClient.invalidateQueries({ queryKey: ["admin-payments-all"] });
        }}
      />
    </>
  );
}
