import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowLeft, Sparkles, FileStack } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SmartContractGenerator from "@/components/contracts/SmartContractGenerator";
import TemplateContractWizard from "@/components/contracts/TemplateContractWizard";
import ContractsList from "@/components/contracts/ContractsList";
import ContractTemplatesManager from "@/components/contracts/ContractTemplatesManager";
import { toast } from "sonner";

type GeneratorMode = null | "ai" | "template";

export default function Contracts() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [generatorMode, setGeneratorMode] = useState<GeneratorMode>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<"contracts" | "templates">("contracts");

  if (!profile || !currentAgency) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const handleContractGenerated = () => {
    setGeneratorMode(null);
    setRefreshKey((p) => p + 1);
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
        {generatorMode ? (
          <Button variant="outline" onClick={() => setGeneratorMode(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        ) : activeTab === "contracts" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setGeneratorMode("ai")}>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGeneratorMode("template")}>
                <FileStack className="mr-2 h-4 w-4" />
                Usar Modelo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {generatorMode === "ai" ? (
        <SmartContractGenerator
          onCancel={() => setGeneratorMode(null)}
          onComplete={handleContractGenerated}
        />
      ) : generatorMode === "template" ? (
        <TemplateContractWizard
          onCancel={() => setGeneratorMode(null)}
          onComplete={handleContractGenerated}
        />
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="w-full"
        >
          <TabsList>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
            <TabsTrigger value="templates">Modelos</TabsTrigger>
          </TabsList>
          <TabsContent value="contracts" className="mt-4">
            <ContractsList
              key={refreshKey}
              onNewContract={() => setGeneratorMode("ai")}
            />
          </TabsContent>
          <TabsContent value="templates" className="mt-4">
            <ContractTemplatesManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
