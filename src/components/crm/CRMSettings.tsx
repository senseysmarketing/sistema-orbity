import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomStatusManager } from "./CustomStatusManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";

export function CRMSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações do CRM</h2>
        <p className="text-muted-foreground">
          Personalize seu pipeline de vendas e integrações
        </p>
      </div>

      <Tabs defaultValue="integration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integration">Integração</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integration">
          <MetaIntegrationConfig />
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
