import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomStatusManager } from "./settings/CustomStatusManager";
import { ContentTypeManager } from "./settings/ContentTypeManager";
import { PlatformManager } from "./settings/PlatformManager";
import { ApprovalRulesManager } from "./settings/ApprovalRulesManager";
import { PostTemplateManager } from "./settings/PostTemplateManager";
import { SchedulePreferencesManager } from "./settings/SchedulePreferencesManager";

export function SocialMediaSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações de Social Media</h2>
        <p className="text-muted-foreground">
          Personalize seu fluxo de trabalho e preferências de postagem
        </p>
      </div>

      <Tabs defaultValue="statuses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="statuses">Status</TabsTrigger>
          <TabsTrigger value="content-types">Tipos</TabsTrigger>
          <TabsTrigger value="platforms">Plataformas</TabsTrigger>
          <TabsTrigger value="approval">Aprovação</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedule">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="statuses">
          <CustomStatusManager />
        </TabsContent>

        <TabsContent value="content-types">
          <ContentTypeManager />
        </TabsContent>

        <TabsContent value="platforms">
          <PlatformManager />
        </TabsContent>

        <TabsContent value="approval">
          <ApprovalRulesManager />
        </TabsContent>

        <TabsContent value="templates">
          <PostTemplateManager />
        </TabsContent>

        <TabsContent value="schedule">
          <SchedulePreferencesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
