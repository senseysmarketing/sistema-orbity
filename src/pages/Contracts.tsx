import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Settings } from "lucide-react";
import ContractGenerator from "@/components/contracts/ContractGenerator";
import ContractsList from "@/components/contracts/ContractsList";
import ServicesTemplateManager from "@/components/contracts/ServicesTemplateManager";
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Gerador de Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie contratos de prestação de serviços
          </p>
        </div>
        {!showGenerator && (
          <Button onClick={() => setShowGenerator(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>

      {showGenerator ? (
        <Card className="p-6">
          <ContractGenerator
            onCancel={() => setShowGenerator(false)}
            onComplete={handleContractGenerated}
          />
        </Card>
      ) : (
        <Tabs defaultValue="contracts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contratos
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Templates de Serviços
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            <ContractsList key={refreshKey} />
          </TabsContent>

          <TabsContent value="templates">
            <ServicesTemplateManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
