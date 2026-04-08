import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Search, Calendar, DollarSign, Eye, Pencil, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  client_name: string;
  client_cpf_cnpj: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_state?: string;
  total_value: number;
  contract_date: string;
  start_date: string;
  end_date: string | null;
  status: string;
  services: any;
  payment_terms?: string;
  created_at: string;
}

interface ContractsListProps {
  onNewContract?: () => void;
}

export default function ContractsList({ onNewContract }: ContractsListProps) {
  const { currentAgency } = useAgency();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (currentAgency?.id) {
      fetchContracts();
    }
  }, [currentAgency?.id]);

  const fetchContracts = async () => {
    if (!currentAgency?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const filteredContracts = contracts.filter(contract =>
    contract.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.client_cpf_cnpj?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      draft: "outline",
      cancelled: "destructive",
      expired: "secondary",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      draft: "Rascunho",
      cancelled: "Cancelado",
      expired: "Expirado",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };

  const handleDeleteContract = async () => {
    if (!contractToDelete) return;

    try {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", contractToDelete);

      if (error) throw error;

      toast.success("Contrato excluído com sucesso");
      fetchContracts();
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Erro ao excluir contrato");
    } finally {
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Carregando contratos...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredContracts.length === 0 ? (
        <Card className="p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {searchTerm ? "Nenhum contrato encontrado" : "Crie seu primeiro contrato com IA"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm
                  ? "Tente buscar com outros termos"
                  : "Gere contratos profissionais em segundos usando inteligência artificial. Basta informar os dados do cliente e do serviço."}
              </p>
            </div>
            {!searchTerm && onNewContract && (
              <Button onClick={onNewContract} className="mt-2">
                <Sparkles className="mr-2 h-4 w-4" />
                Criar contrato com IA
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{contract.client_name}</h3>
                    <p className="text-sm text-muted-foreground">{contract.client_cpf_cnpj}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(contract.status)}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewContract(contract)}
                      title="Visualizar detalhes"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        toast.info("Edição de contratos em desenvolvimento");
                      }}
                      title="Editar contrato"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContractToDelete(contract.id);
                        setDeleteDialogOpen(true);
                      }}
                      title="Excluir contrato"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Total</p>
                    <p className="font-semibold">{formatCurrency(contract.total_value)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Início</p>
                    <p className="font-medium">{formatDate(contract.start_date)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Término</p>
                    <p className="font-medium">
                      {contract.end_date ? formatDate(contract.end_date) : "Indeterminado"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                  <p className="text-sm">{selectedContract.client_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
                  <p className="text-sm">{selectedContract.client_cpf_cnpj || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedContract.client_email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p className="text-sm">{selectedContract.client_phone || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                  <p className="text-sm">{selectedContract.client_address || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Cidade/Estado</p>
                  <p className="text-sm">
                    {selectedContract.client_city && selectedContract.client_state
                      ? `${selectedContract.client_city} - ${selectedContract.client_state}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data do Contrato</p>
                  <p className="text-sm">{formatDate(selectedContract.contract_date)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Início</p>
                  <p className="text-sm">{formatDate(selectedContract.start_date)}</p>
                </div>
                {selectedContract.end_date && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Término</p>
                    <p className="text-sm">{formatDate(selectedContract.end_date)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-sm font-semibold">{formatCurrency(selectedContract.total_value)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Serviços</p>
                <div className="space-y-2">
                  {(selectedContract.services as any[])?.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{service.name}</span>
                      <span className="text-sm font-medium">{formatCurrency(service.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedContract.payment_terms && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Forma de Pagamento</p>
                  <p className="text-sm">{selectedContract.payment_terms}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteContract}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
