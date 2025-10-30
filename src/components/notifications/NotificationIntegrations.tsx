import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppIntegration } from "./integrations/WhatsAppIntegration";
import { EmailIntegration } from "./integrations/EmailIntegration";
import { DiscordIntegration } from "./integrations/DiscordIntegration";
import { SlackIntegration } from "./integrations/SlackIntegration";
import { CustomWebhookIntegration } from "./integrations/CustomWebhookIntegration";
import { MessageSquare, Mail, MessageCircle, Hash, Webhook } from "lucide-react";

export function NotificationIntegrations() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrações de Notificações</h2>
        <p className="text-muted-foreground">
          Configure os canais de entrega de notificações da sua agência
        </p>
      </div>

      <Tabs defaultValue="whatsapp" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="discord" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>Discord</span>
          </TabsTrigger>
          <TabsTrigger value="slack" className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            <span>Slack</span>
          </TabsTrigger>
          <TabsTrigger value="webhook" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span>Webhook</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <WhatsAppIntegration />
        </TabsContent>

        <TabsContent value="email">
          <EmailIntegration />
        </TabsContent>

        <TabsContent value="discord">
          <DiscordIntegration />
        </TabsContent>

        <TabsContent value="slack">
          <SlackIntegration />
        </TabsContent>

        <TabsContent value="webhook">
          <CustomWebhookIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
