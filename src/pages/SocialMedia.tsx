import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Settings, TrendingUp, Sparkles, Type } from "lucide-react";
import { SocialMediaCalendar } from "@/components/social-media/SocialMediaCalendar";
import { SocialMediaSettings } from "@/components/social-media/SocialMediaSettings";
import { SocialMediaAnalytics } from "@/components/social-media/SocialMediaAnalytics";
import { ContentPlanningList } from "@/components/social-media/planning/ContentPlanningList";
import { CaptionGenerator } from "@/components/social-media/CaptionGenerator";

export default function SocialMedia() {
  const [activeTab, setActiveTab] = useState("planning");

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Social Media Planner</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie todo o workflow de criação de conteúdo para redes sociais
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="planning" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Planejamento</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="captions" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">Legendas</span>
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

        <TabsContent value="planning" className="space-y-4">
          <ContentPlanningList />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <SocialMediaCalendar />
        </TabsContent>

        <TabsContent value="captions" className="space-y-4">
          <CaptionGenerator />
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
