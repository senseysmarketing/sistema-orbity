import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import SmartContractGenerator from "@/components/contracts/SmartContractGenerator";
import ContractsList from "@/components/contracts/ContractsList";
import { toast } from "sonner";

export default function Contracts() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [showGenerator, setShowGenerator] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!profile || !currentAgency) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const handleContractGenerated = () => {
    setShowGenerator(false);
    setRefreshKey(prev => prev + 1);
    toast.success("Contrato gerado com sucesso!");
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Contratos
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Crie e gerencie contratos de prestação de serviços
          </p>
        </div>
        {showGenerator ? (
          <Button variant="outline" onClick={() => setShowGenerator(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        ) : (
          <Button onClick={() => setShowGenerator(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>

      {showGenerator ? (
        <SmartContractGenerator
          onCancel={() => setShowGenerator(false)}
          onComplete={handleContractGenerated}
        />
      ) : (
        <ContractsList key={refreshKey} onNewContract={() => setShowGenerator(true)} />
      )}
    </div>
  );
}
