import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, Calendar, DollarSign, User } from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  client_name: string;
  client_cpf_cnpj: string;
  total_value: number;
  contract_date: string;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

export default function ContractsList() {
  const { currentAgency } = useAgency();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      cancelled: "destructive",
      expired: "secondary",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      cancelled: "Cancelado",
      expired: "Expirado",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
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
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-2">
            {searchTerm ? "Nenhum contrato encontrado" : "Nenhum contrato gerado ainda"}
          </p>
          {!searchTerm && (
            <p className="text-sm text-muted-foreground">
              Clique em "Novo Contrato" para começar
            </p>
          )}
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
                {getStatusBadge(contract.status)}
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
    </div>
  );
}
