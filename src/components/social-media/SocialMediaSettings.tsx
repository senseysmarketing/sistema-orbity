import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomStatusManager } from "./settings/CustomStatusManager";
import { ContentTypeManager } from "./settings/ContentTypeManager";
import { PlatformManager } from "./settings/PlatformManager";
import { ApprovalRulesManager } from "./settings/ApprovalRulesManager";
import { PostTemplateManager } from "./settings/PostTemplateManager";
import { SchedulePreferencesManager } from "./settings/SchedulePreferencesManager";
import { DueDateSettingsManager } from "./settings/DueDateSettingsManager";
import { 
  Layers, 
  Type, 
  Share2, 
  CheckSquare, 
  FileText, 
  Clock, 
  CalendarClock 
} from "lucide-react";

export function SocialMediaSettings() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Configurações de Social Media</h2>
        <p className="text-sm text-muted-foreground">
          Personalize seu fluxo de trabalho e preferências de postagem
        </p>
      </div>

      <Tabs defaultValue="statuses" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="statuses" className="flex-shrink-0 gap-1 md:gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Status</span>
          </TabsTrigger>
          <TabsTrigger value="content-types" className="flex-shrink-0 gap-1 md:gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos</span>
          </TabsTrigger>
          <TabsTrigger value="platforms" className="flex-shrink-0 gap-1 md:gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Plataformas</span>
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex-shrink-0 gap-1 md:gap-2">
            <CheckSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Aprovação</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-shrink-0 gap-1 md:gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex-shrink-0 gap-1 md:gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Horários</span>
          </TabsTrigger>
          <TabsTrigger value="deadlines" className="flex-shrink-0 gap-1 md:gap-2">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Prazos</span>
          </TabsTrigger>
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

        <TabsContent value="deadlines">
          <DueDateSettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
