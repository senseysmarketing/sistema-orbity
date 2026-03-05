import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomStatusManager } from "./CustomStatusManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";
import { ManualInvestmentManager } from "./ManualInvestmentManager";
import { WhatsAppTemplateManager } from "./WhatsAppTemplateManager";
import { Link2, DollarSign, Layers, MessageSquare } from "lucide-react";

export function CRMSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Configurações do CRM</h2>
        <p className="text-sm text-muted-foreground">
          Personalize seu pipeline de vendas e integrações
        </p>
      </div>

      <Tabs defaultValue="integration" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="integration" className="flex-shrink-0 gap-1 md:gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex-shrink-0 gap-1 md:gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Investimentos</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex-shrink-0 gap-1 md:gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-shrink-0 gap-1 md:gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetaIntegrationConfig />
            <WebhooksManager />
          </div>
        </TabsContent>

        <TabsContent value="investments">
          <ManualInvestmentManager />
        </TabsContent>

        <TabsContent value="status">
          <CustomStatusManager />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
