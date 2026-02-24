import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformManager } from "./settings/PlatformManager";
import { DueDateSettingsManager } from "./settings/DueDateSettingsManager";
import { Share2, CalendarClock } from "lucide-react";

export function SocialMediaSettings() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Configurações de Social Media</h2>
        <p className="text-sm text-muted-foreground">
          Personalize suas plataformas e prazos de entrega
        </p>
      </div>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="platforms" className="flex-shrink-0 gap-1 md:gap-2">
            <Share2 className="h-4 w-4" />
            <span>Plataformas</span>
          </TabsTrigger>
          <TabsTrigger value="deadlines" className="flex-shrink-0 gap-1 md:gap-2">
            <CalendarClock className="h-4 w-4" />
            <span>Prazos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="platforms">
          <PlatformManager />
        </TabsContent>

        <TabsContent value="deadlines">
          <DueDateSettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
