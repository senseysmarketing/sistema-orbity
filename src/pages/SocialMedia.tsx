import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, LayoutGrid, Settings, TrendingUp } from "lucide-react";
import { SocialMediaCalendar } from "@/components/social-media/SocialMediaCalendar";
import { PostKanban } from "@/components/social-media/PostKanban";
import { SocialMediaSettings } from "@/components/social-media/SocialMediaSettings";
import { SocialMediaAnalytics } from "@/components/social-media/SocialMediaAnalytics";

export default function SocialMedia() {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Social Media Planner</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie todo o workflow de criação de conteúdo para redes sociais
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Análises</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <SocialMediaCalendar />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <PostKanban />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <SocialMediaAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SocialMediaSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
