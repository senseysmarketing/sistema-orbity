import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomStatusManager } from "./CustomStatusManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";
import { ManualInvestmentManager } from "./ManualInvestmentManager";
import { Link2, DollarSign, Layers, Webhook } from "lucide-react";

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
            <span className="hidden sm:inline">Integração</span>
          </TabsTrigger>
          <TabsTrigger value="investments" className="flex-shrink-0 gap-1 md:gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Investimentos</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex-shrink-0 gap-1 md:gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex-shrink-0 gap-1 md:gap-2">
            <Webhook className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration">
          <MetaIntegrationConfig />
        </TabsContent>

        <TabsContent value="investments">
          <ManualInvestmentManager />
        </TabsContent>

        <TabsContent value="status">
          <CustomStatusManager />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
